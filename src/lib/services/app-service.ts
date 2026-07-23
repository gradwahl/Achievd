import { revalidateTag, unstable_cache } from "next/cache";
import { getRepository } from "@/lib/repositories";
import { buildRecommendations } from "@/lib/services/recommendations";
import type { DashboardView } from "@/lib/types";

const APP_DATA_TAG = "app-data";
const EMPTY_MONTH_CHANGE: DashboardView["monthChange"] = {
  unlocked: 0,
  remaining: 0,
  perfected: 0,
  gamesWithAchievements: 0,
  recentUnlocks: 0,
  completionPercentage: 0,
};

const getCachedDashboardData = unstable_cache(
  async (userId: string) => getRepository().getDashboard(userId),
  ["dashboard-data"],
  { tags: [APP_DATA_TAG] },
);

const getCachedGamesData = unstable_cache(
  async (userId: string) => getRepository().getGames(userId),
  ["games-data"],
  { tags: [APP_DATA_TAG] },
);

const getCachedSettingsData = unstable_cache(
  async (userId: string) => getRepository().getPreferences(userId),
  ["settings-data"],
  { tags: [APP_DATA_TAG] },
);

const getCachedRecommendationsData = unstable_cache(
  async (userId: string) => {
    const repository = getRepository();
    const [games, achievementsByAppId] = await Promise.all([
      repository.getGames(userId),
      repository.getAchievementsByAppId(userId),
    ]);
    return buildRecommendations(games, achievementsByAppId);
  },
  ["recommendations-data"],
  { tags: [APP_DATA_TAG] },
);

export function invalidateAppDataCache() {
  revalidateTag(APP_DATA_TAG, "max");
}

export async function getDashboardData(userId: string) {
  const dashboard = await getCachedDashboardData(userId);
  return {
    ...dashboard,
    monthChange: dashboard.monthChange ?? EMPTY_MONTH_CHANGE,
  };
}

export async function getGamesData(userId: string) {
  return getCachedGamesData(userId);
}

export async function getGameDetailData(userId: string, appId: number) {
  return getRepository().getGameDetail(userId, appId);
}

export async function getPlannerData(userId: string) {
  return getRepository().getPlanner(userId);
}

export async function getSettingsData(userId: string) {
  return getCachedSettingsData(userId);
}

export async function getRecommendationsData(userId: string) {
  return getCachedRecommendationsData(userId);
}
