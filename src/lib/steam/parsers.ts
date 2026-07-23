import { z } from "zod";
import type {
  ParsedOwnedGames,
  SteamGameSchema,
  SteamGlobalAchievement,
  SteamPlayerAchievement,
  SteamProfile,
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

export function parseGlobalAchievementPercentages(
  payload: unknown,
): SteamGlobalAchievement[] {
  const parsed = globalPercentagesSchema.parse(payload);
  return parsed.achievementpercentages.achievements.map((achievement) => ({
    apiName: achievement.name,
    percent: achievement.percent,
  }));
}
