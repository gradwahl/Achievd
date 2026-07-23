import type { SteamOwnedGame } from "@/lib/steam/types";

export function hasPotentialAchievementStats(game: SteamOwnedGame) {
  return game.hasCommunityVisibleStats !== false;
}
