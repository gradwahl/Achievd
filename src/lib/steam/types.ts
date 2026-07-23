import type { VisibilityState } from "@/lib/types";

export type SteamProfile = {
  steamId: string;
  displayName: string;
  avatarSmallUrl?: string;
  avatarMediumUrl?: string;
  avatarFullUrl?: string;
  profileUrl?: string;
  visibilityState: VisibilityState;
};

export type SteamOwnedGame = {
  appId: number;
  name?: string;
  playtimeMinutes?: number;
  lastPlayedAt?: string;
  hasCommunityVisibleStats?: boolean;
};

export type ParsedOwnedGames = {
  games: SteamOwnedGame[];
  unavailable: boolean;
};

export type SteamSchemaAchievement = {
  apiName: string;
  displayName: string;
  description?: string;
  hidden: boolean;
  lockedIconUrl?: string;
  unlockedIconUrl?: string;
};

export type SteamPlayerAchievement = {
  apiName: string;
  unlocked: boolean;
  unlockedAt?: string;
};

export type SteamGlobalAchievement = {
  apiName: string;
  percent: number;
};

export type SteamGameSchema = {
  appId: number;
  gameName?: string;
  achievements: SteamSchemaAchievement[];
};

export type SteamAdapter = {
  getProfile(steamId: string): Promise<SteamProfile>;
  getOwnedGames(steamId: string): Promise<ParsedOwnedGames>;
  getPlayerAchievements(
    steamId: string,
    appId: number,
  ): Promise<SteamPlayerAchievement[]>;
  getAchievementSchema(appId: number): Promise<SteamGameSchema>;
  getGlobalAchievementPercentages(
    appId: number,
  ): Promise<SteamGlobalAchievement[]>;
};
