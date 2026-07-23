import { completionPercentage } from "@/lib/calculations";
import type { AchievementView, GameSummary } from "@/lib/types";

export type ExistingSyncState = {
  games: GameSummary[];
  achievementsByAppId: Record<number, AchievementView[]>;
};

export type IncomingSyncState = {
  games?: Partial<GameSummary>[];
  achievementsByAppId?: Record<number, Partial<AchievementView>[]>;
};

export function mergeSyncState(
  existing: ExistingSyncState,
  incoming: IncomingSyncState,
): ExistingSyncState {
  const gamesByAppId = new Map(
    existing.games.map((game) => [game.appId, game]),
  );
  for (const game of incoming.games ?? []) {
    if (!game.appId) continue;
    const previous = gamesByAppId.get(game.appId);
    const total =
      game.totalAchievementCount ?? previous?.totalAchievementCount ?? 0;
    const unlocked =
      game.unlockedAchievementCount ?? previous?.unlockedAchievementCount ?? 0;
    gamesByAppId.set(game.appId, {
      id: previous?.id ?? `game-${game.appId}`,
      appId: game.appId,
      name: game.name ?? previous?.name ?? `App ${game.appId}`,
      capsuleImageUrl: game.capsuleImageUrl ?? previous?.capsuleImageUrl,
      headerImageUrl: game.headerImageUrl ?? previous?.headerImageUrl,
      playtimeMinutes: game.playtimeMinutes ?? previous?.playtimeMinutes,
      unlockedAchievementCount: unlocked,
      totalAchievementCount: total,
      completionPercentage: completionPercentage(unlocked, total),
      perfected: total > 0 && unlocked === total,
      lastPlayedAt: game.lastPlayedAt ?? previous?.lastPlayedAt,
      lastSyncedAt: game.lastSyncedAt ?? previous?.lastSyncedAt,
      hasAchievementData: total > 0,
    });
  }

  return {
    games: Array.from(gamesByAppId.values()),
    achievementsByAppId: {
      ...existing.achievementsByAppId,
      ...(incoming.achievementsByAppId ?? {}),
    } as Record<number, AchievementView[]>,
  };
}
