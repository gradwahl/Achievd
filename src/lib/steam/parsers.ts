import { z } from "zod";
import type {
  ParsedOwnedGames,
  SteamOwnedGame,
  SteamGameSchema,
  SteamGlobalAchievement,
  SteamPlayerAchievement,
  SteamProfile,
  SteamStoreDetails,
} from "@/lib/steam/types";
import type { VisibilityState } from "@/lib/types";

const playerSummarySchema = z.object({
  response: z.object({
    players: z
      .array(
        z.object({
          steamid: z.string(),
          personaname: z.string().optional(),
          avatar: z.string().optional(),
          avatarmedium: z.string().optional(),
          avatarfull: z.string().optional(),
          profileurl: z.string().optional(),
          communityvisibilitystate: z.number().optional(),
        }),
      )
      .default([]),
  }),
});

const ownedGamesSchema = z.object({
  response: z.object({
    game_count: z.number().optional(),
    games: z
      .array(
        z.object({
          appid: z.number(),
          name: z.string().optional(),
          playtime_forever: z.number().optional(),
          rtime_last_played: z.number().optional(),
          has_community_visible_stats: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
});

const playerAchievementsSchema = z.object({
  playerstats: z.object({
    success: z.boolean().optional(),
    achievements: z
      .array(
        z.object({
          apiname: z.string(),
          achieved: z.number().optional(),
          unlocktime: z.number().optional(),
        }),
      )
      .optional(),
  }),
});

const schemaForGameSchema = z.object({
  game: z
    .object({
      gameName: z.string().optional(),
      availableGameStats: z
        .object({
          achievements: z
            .array(
              z.object({
                name: z.string(),
                displayName: z.string().optional(),
                description: z.string().optional(),
                hidden: z.number().optional(),
                icon: z.string().optional(),
                icongray: z.string().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

const globalPercentagesSchema = z.object({
  achievementpercentages: z.object({
    achievements: z
      .array(
        z.object({
          name: z.string(),
          percent: z.coerce.number(),
        }),
      )
      .default([]),
  }),
});

const storeDetailsSchema = z.record(
  z.string(),
  z.object({
    success: z.boolean().optional(),
    data: z
      .object({
        developers: z.array(z.string()).optional(),
        genres: z
          .array(
            z.object({
              description: z.string().optional(),
            }),
          )
          .optional(),
        publishers: z.array(z.string()).optional(),
      })
      .optional(),
  }),
);

function visibilityFromSteam(value?: number): VisibilityState {
  if (value === 3) return "public";
  if (value === 2) return "friends_only";
  if (value === 1) return "private";
  return "unknown";
}

function unixToIso(value?: number) {
  if (!value) return undefined;
  return new Date(value * 1000).toISOString();
}

function imageUrl(value?: string) {
  return value && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(value)
    ? value
    : undefined;
}

function htmlText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function parsePlayerSummary(payload: unknown): SteamProfile {
  const parsed = playerSummarySchema.parse(payload);
  const player = parsed.response.players[0];
  if (!player) {
    return {
      steamId: "",
      displayName: "Unknown player",
      visibilityState: "unknown",
    };
  }

  return {
    steamId: player.steamid,
    displayName: player.personaname ?? "Steam player",
    avatarSmallUrl: player.avatar,
    avatarMediumUrl: player.avatarmedium,
    avatarFullUrl: player.avatarfull,
    profileUrl: player.profileurl,
    visibilityState: visibilityFromSteam(player.communityvisibilitystate),
  };
}

export function parseOwnedGames(payload: unknown): ParsedOwnedGames {
  const parsed = ownedGamesSchema.parse(payload);
  const games = parsed.response.games;
  if (!games) return { games: [], unavailable: true };

  return {
    unavailable: false,
    games: games.map((game) => ({
      appId: game.appid,
      name: game.name,
      playtimeMinutes: game.playtime_forever,
      lastPlayedAt: unixToIso(game.rtime_last_played),
      hasCommunityVisibleStats: game.has_community_visible_stats,
    })),
  };
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

export function parseSteamLibraryCsv(text: string): SteamOwnedGame[] {
  const [headerRow, ...dataRows] = parseCsvRows(text);
  if (!headerRow) return [];

  const headers = headerRow.map((header) => header.replace(/^\uFEFF/, ""));
  const index = (name: string) => headers.indexOf(name);
  const gameIndex = index("game");
  const idIndex = index("id");
  const hoursIndex = index("hours");
  const achievementsIndex = index("steam achievements");
  if (gameIndex < 0 || idIndex < 0 || achievementsIndex < 0) return [];

  return dataRows.flatMap((row) => {
    if (row[achievementsIndex]?.trim().toLowerCase() !== "x") return [];
    const appId = Number(row[idIndex]);
    if (!Number.isInteger(appId)) return [];
    const hours = Number(row[hoursIndex]);
    return [
      {
        appId,
        name: row[gameIndex] || undefined,
        playtimeMinutes: Number.isFinite(hours)
          ? Math.round(hours * 60)
          : undefined,
      },
    ];
  });
}

export function parsePlayerAchievements(
  payload: unknown,
): SteamPlayerAchievement[] {
  const parsed = playerAchievementsSchema.parse(payload);
  if (parsed.playerstats.success === false) return [];

  return (parsed.playerstats.achievements ?? []).map((achievement) => ({
    apiName: achievement.apiname,
    unlocked: achievement.achieved === 1,
    unlockedAt:
      achievement.achieved === 1
        ? unixToIso(achievement.unlocktime)
        : undefined,
  }));
}

export function parseAchievementSchema(
  appId: number,
  payload: unknown,
): SteamGameSchema {
  const parsed = schemaForGameSchema.parse(payload);
  const achievements =
    parsed.game?.availableGameStats?.achievements?.map((achievement) => ({
      apiName: achievement.name,
      displayName: achievement.displayName ?? achievement.name,
      description: achievement.description,
      hidden: achievement.hidden === 1,
      lockedIconUrl: imageUrl(achievement.icongray),
      unlockedIconUrl: imageUrl(achievement.icon),
    })) ?? [];

  return {
    appId,
    gameName: parsed.game?.gameName,
    achievements,
  };
}

export function parseCommunityAchievementSchema(
  appId: number,
  html: string,
  globalAchievements: SteamGlobalAchievement[],
): SteamGameSchema {
  const rows = [
    ...html.matchAll(
      /achieveImgHolder[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<h5>([\s\S]*?)<\/h5>/g,
    ),
  ];

  return {
    appId,
    achievements: globalAchievements.map((achievement, index) => {
      const row = rows[index];
      return {
        apiName: achievement.apiName,
        displayName: row ? htmlText(row[2] ?? "") : achievement.apiName,
        description: row ? htmlText(row[3] ?? "") : undefined,
        hidden: false,
        lockedIconUrl: imageUrl(row?.[1]),
        unlockedIconUrl: imageUrl(row?.[1]),
      };
    }),
  };
}

export function parseGlobalAchievementPercentages(
  payload: unknown,
): SteamGlobalAchievement[] {
  const parsed = globalPercentagesSchema.parse(payload);
  return parsed.achievementpercentages.achievements.map((achievement) => ({
    apiName: achievement.name,
    percent: achievement.percent,
  }));
}

export function parseStoreDetails(
  appId: number,
  payload: unknown,
): SteamStoreDetails {
  const item = storeDetailsSchema.parse(payload)[String(appId)];
  return {
    developers: item?.success === false ? [] : (item?.data?.developers ?? []),
    genres:
      item?.success === false
        ? []
        : (item?.data?.genres ?? []).flatMap((genre) =>
            genre.description ? [genre.description] : [],
          ),
    publishers: item?.success === false ? [] : (item?.data?.publishers ?? []),
  };
}
