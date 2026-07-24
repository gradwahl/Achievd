import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { productConfig } from "@/config/product";
import { AppError } from "@/lib/errors";
import {
  parseAchievementSchema,
  parseCommunityAchievementSchema,
  parseGlobalAchievementPercentages,
  parseOwnedGames,
  parsePlayerAchievements,
  parsePlayerSummary,
  parseSteamLibraryCsv,
  parseStoreDetails,
} from "@/lib/steam/parsers";
import type { SteamAdapter } from "@/lib/steam/types";

type Fetcher = typeof fetch;
const responseCache = new Map<string, { expiresAt: number; value: unknown }>();

export class SteamApiClient implements SteamAdapter {
  private readonly apiKey: string;

  constructor(
    apiKey = env.STEAM_API_KEY,
    private readonly fetcher: Fetcher = fetch,
  ) {
    if (!apiKey) {
      throw new AppError(
        "VALIDATION_FAILED",
        "STEAM_API_KEY is required for Steam sync.",
        500,
      );
    }
    this.apiKey = apiKey;
  }

  async getProfile(steamId: string) {
    return parsePlayerSummary(
      await this.cachedGet(
        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
        {
          key: this.apiKey,
          steamids: steamId,
        },
        600_000,
      ),
    );
  }

  async getOwnedGames(steamId: string) {
    const owned = parseOwnedGames(
      await this.cachedGet(
        "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
        {
          key: this.apiKey,
          steamid: steamId,
          include_appinfo: "true",
          include_played_free_games: "true",
        },
        600_000,
      ),
    );
    const csvGames = await readSteamLibraryExport(steamId);
    if (!csvGames.length) return owned;

    const gamesById = new Map(owned.games.map((game) => [game.appId, game]));
    for (const game of csvGames) {
      if (!gamesById.has(game.appId)) gamesById.set(game.appId, game);
    }
    return { ...owned, games: [...gamesById.values()] };
  }

  async getPlayerAchievements(steamId: string, appId: number) {
    return parsePlayerAchievements(
      await this.get(
        "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
        {
          key: this.apiKey,
          steamid: steamId,
          appid: String(appId),
        },
      ),
    );
  }

  async getAchievementSchema(appId: number) {
    try {
      const schema = parseAchievementSchema(
        appId,
        await this.cachedGet(
          "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/",
          {
            key: this.apiKey,
            appid: String(appId),
          },
          86_400_000,
        ),
      );
      return schema.achievements.length
        ? schema
        : await this.getPublicAchievementSchema(appId);
    } catch (error) {
      if (error instanceof AppError && error.code === "STEAM_PERMANENT") {
        return this.getPublicAchievementSchema(appId);
      }
      throw error;
    }
  }

  async getStoreDetails(appId: number) {
    return parseStoreDetails(
      appId,
      await this.cachedGet(
        "https://store.steampowered.com/api/appdetails",
        {
          appids: String(appId),
          filters: "developers,genres,publishers",
        },
        604_800_000,
      ),
    );
  }

  async getGlobalAchievementPercentages(appId: number) {
    return parseGlobalAchievementPercentages(
      await this.cachedGet(
        "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
        { gameid: String(appId) },
        86_400_000,
      ),
    );
  }

  private async getPublicAchievementSchema(appId: number) {
    const [globalAchievements, communityPage] = await Promise.all([
      this.getGlobalAchievementPercentages(appId),
      this.getText(
        `https://steamcommunity.com/stats/${appId}/achievements?xml=1`,
      ),
    ]);
    return parseCommunityAchievementSchema(
      appId,
      communityPage,
      globalAchievements,
    );
  }

  private async cachedGet(
    url: string,
    params: Record<string, string>,
    ttlMs: number,
  ) {
    const key = `${url}?${JSON.stringify(params)}`;
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const value = await this.get(url, params);
    responseCache.set(key, { expiresAt: Date.now() + ttlMs, value });
    return value;
  }

  private async get(url: string, params: Record<string, string>) {
    const fullUrl = new URL(url);
    Object.entries(params).forEach(([key, value]) =>
      fullUrl.searchParams.set(key, value),
    );

    return withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      let response: Response;
      try {
        response = await this.fetcher(fullUrl, {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new AppError(
            "STEAM_TEMPORARY",
            "Steam request timed out. Existing data was preserved.",
            504,
          );
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }

      if (response.status === 403) {
        throw new AppError(
          "PRIVATE_PROFILE",
          "Steam profile data is private or unavailable.",
          403,
        );
      }

      if (response.status === 429 || response.status >= 500) {
        throw new AppError(
          "STEAM_TEMPORARY",
          "Steam is temporarily unavailable. Existing data was preserved.",
          response.status,
        );
      }

      if (!response.ok) {
        throw new AppError(
          "STEAM_PERMANENT",
          "Steam rejected the request.",
          response.status,
        );
      }

      return response.json() as Promise<unknown>;
    });
  }

  private async getText(url: string) {
    const response = await this.fetcher(url, {
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    if (!response.ok) {
      throw new AppError(
        "STEAM_PERMANENT",
        "Steam rejected the request.",
        response.status,
      );
    }
    return response.text();
  }
}

async function readSteamLibraryExport(steamId: string) {
  const file = path.join(
    os.homedir(),
    "Downloads",
    `steam-library-${steamId}.csv`,
  );
  // ponytail: local CSV fallback for Steam Web API omissions; add UI import if users need arbitrary locations.
  if (!existsSync(file)) return [];
  return parseSteamLibraryCsv(await readFile(file, "utf8"));
}

async function withRetry<T>(operation: () => Promise<T>, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof AppError) ||
        error.code !== "STEAM_TEMPORARY" ||
        attempt === attempts - 1
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function getSteamAdapter() {
  const cookieStore = await cookies();
  const localApiKey = cookieStore.get(
    productConfig.steamApiKeyCookieName,
  )?.value;
  if (localApiKey) {
    return new SteamApiClient(localApiKey, fetch.bind(globalThis));
  }

  return Promise.resolve(
    new SteamApiClient(env.STEAM_API_KEY, fetch.bind(globalThis)),
  );
}

export function shouldRefreshSchema(lastSyncedAt?: string | null) {
  if (!lastSyncedAt) return true;
  const maxAge = productConfig.sync.schemaCacheDays * 86_400_000;
  return Date.now() - new Date(lastSyncedAt).getTime() > maxAge;
}

export function shouldRefreshRarity(lastSyncedAt?: string | null) {
  if (!lastSyncedAt) return true;
  const maxAge = productConfig.sync.rarityCacheHours * 3_600_000;
  return Date.now() - new Date(lastSyncedAt).getTime() > maxAge;
}
