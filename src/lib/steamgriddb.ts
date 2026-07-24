import { z } from "zod";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors";

export type SteamGridArtType = "boxart" | "banner";

export const steamGridArtSchema = z.object({
  id: z.number(),
  url: z.string().url(),
  thumb: z.string().url().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const cache = new Map<
  string,
  { expiresAt: number; art: z.infer<typeof steamGridArtSchema>[] }
>();

export async function getSteamGridArt(appId: number, type: SteamGridArtType) {
  if (!env.STEAMGRIDDB_API_KEY) {
    throw new AppError(
      "VALIDATION_FAILED",
      "SteamGridDB API key is missing.",
      400,
    );
  }

  const cacheKey = `${type}:${appId}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.art;

  const kind = type === "banner" ? "heroes" : "grids";
  const response = await fetch(
    `https://www.steamgriddb.com/api/v2/${kind}/steam/${appId}`,
    { headers: { Authorization: `Bearer ${env.STEAMGRIDDB_API_KEY}` } },
  );
  if (!response.ok) {
    throw new AppError(
      "STEAM_TEMPORARY",
      "SteamGridDB lookup failed.",
      response.status,
    );
  }

  const body = (await response.json()) as unknown;
  const parsed = z
    .object({ data: z.array(steamGridArtSchema).default([]) })
    .safeParse(body);
  const art = parsed.success ? parsed.data.data.slice(0, 16) : [];
  cache.set(cacheKey, { expiresAt: Date.now() + 3_600_000, art });
  return art;
}
