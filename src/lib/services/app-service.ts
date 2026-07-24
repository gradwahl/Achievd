import { revalidateTag, unstable_cache } from "next/cache";
import { getRepository } from "@/lib/repositories";
import { prisma } from "@/lib/repositories/prisma";
import { buildRecommendations } from "@/lib/services/recommendations";
import { getSteamAdapter } from "@/lib/steam/client";
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
  return getRepository().getGames(userId);
}

export async function getGameDetailData(userId: string, appId: number) {
  const detail = await getRepository().getGameDetail(userId, appId);
  if (
    detail.game.genres.length &&
    detail.game.developers.length &&
    detail.game.publishers.length
  ) {
    return detail;
  }

  const storeDetails = await getSteamAdapter()
    .then((adapter) => adapter.getStoreDetails(appId))
    .catch(() => ({ developers: [], genres: [], publishers: [] }));
  if (
    !storeDetails.genres.length &&
    !storeDetails.developers.length &&
    !storeDetails.publishers.length
  ) {
    return detail;
  }

  await prisma.game.update({
    where: { steamAppId: appId },
    data: storeDetails,
  });
  return { ...detail, game: { ...detail.game, ...storeDetails } };
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
