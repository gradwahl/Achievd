import type { AchievementView, GameSummary, Recommendation } from "@/lib/types";

function remaining(game: GameSummary) {
  return Math.max(
    0,
    game.totalAchievementCount - game.unlockedAchievementCount,
  );
}

function daysSince(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
}

export function buildRecommendations(
  games: GameSummary[],
  achievementsByAppId: Record<number, AchievementView[]>,
) {
  const candidates = games.filter(
    (game) => game.hasAchievementData && !game.perfected && remaining(game) > 0,
  );
  const recommendations: Recommendation[] = [];

  const add = (
    game: GameSummary | undefined,
    label: string,
    explanation: string,
    score: number,
  ) => {
    if (!game) return;
    const id = `${label}:${game.appId}`;
    if (recommendations.some((item) => item.id === id)) return;
    recommendations.push({ id, game, label, explanation, score });
  };

  const closest = [...candidates].sort(
    (a, b) => b.completionPercentage - a.completionPercentage,
  )[0];
  add(
    closest,
    "Closest to completion",
    closest
      ? `You have ${remaining(closest)} achievements remaining at ${closest.completionPercentage}% completion.`
      : "",
    100,
  );

  const fewest = [...candidates].sort((a, b) => remaining(a) - remaining(b))[0];
  add(
    fewest,
    "Fewest remaining",
    fewest ? `Only ${remaining(fewest)} achievements remain.` : "",
    90,
  );

  const recentNearly = candidates
    .filter(
      (game) =>
        daysSince(game.lastPlayedAt) <= 14 && game.completionPercentage >= 60,
    )
    .sort((a, b) => daysSince(a.lastPlayedAt) - daysSince(b.lastPlayedAt))[0];
  add(
    recentNearly,
    "Recently played and nearly complete",
    recentNearly
      ? `You have ${remaining(recentNearly)} achievements remaining and played this within the last 14 days.`
      : "",
    80,
  );

  const quickWin = candidates
    .filter((game) => remaining(game) <= 3)
    .sort((a, b) => remaining(a) - remaining(b))[0];
  add(
    quickWin,
    "Quick win",
    quickWin
      ? `${quickWin.name} is within ${remaining(quickWin)} achievements of 100%.`
      : "",
    70,
  );

  const rareOpportunity = candidates
    .map((game) => ({
      game,
      rareLocked: (achievementsByAppId[game.appId] ?? []).find(
        (achievement) =>
          !achievement.unlocked &&
          (achievement.rarity === "rare" ||
            achievement.rarity === "ultra-rare"),
      ),
    }))
    .filter((item) => item.rareLocked && item.game.completionPercentage >= 50)
    .sort(
      (a, b) =>
        (a.rareLocked!.globalCompletionPercentage ?? 100) -
        (b.rareLocked!.globalCompletionPercentage ?? 100),
    )[0];
  add(
    rareOpportunity?.game,
    "Rare-achievement opportunity",
    rareOpportunity?.rareLocked
      ? `${rareOpportunity.rareLocked.displayName} is ${rareOpportunity.rareLocked.rarity} and you already have ${rareOpportunity.game.completionPercentage}% completion.`
      : "",
    60,
  );

  const neglected = candidates
    .filter(
      (game) =>
        daysSince(game.lastPlayedAt) > 30 && game.completionPercentage >= 40,
    )
    .sort((a, b) => b.completionPercentage - a.completionPercentage)[0];
  add(
    neglected,
    "Neglected progress",
    neglected
      ? `${neglected.name} has substantial progress but has not been played in over 30 days.`
      : "",
    50,
  );

  return recommendations.sort((a, b) => b.score - a.score).slice(0, 6);
}
