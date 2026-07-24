import { productConfig } from "@/config/product";
import { defaultPreferences } from "@/config/default-preferences";
import { AppError } from "@/lib/errors";
import { classifyRarity, completionPercentage } from "@/lib/calculations";
import { prisma } from "@/lib/repositories/prisma";
import {
  getAchievementGroups,
  getSteamHuntersAppMeta,
  getSteamHuntersAchievementMeta,
} from "@/lib/steam/achievement-groups";
import { themePreferences } from "@/lib/types";
import type {
  AppRepository,
  PinPatch,
} from "@/lib/repositories/app-repository";
import type { SteamAdapter } from "@/lib/steam/types";
import type {
  AchievementView,
  GameSummary,
  PlannerItem,
  RecentAchievement,
  SyncStatusView,
  UserPreferences,
  VisibilityState,
} from "@/lib/types";
import { z } from "zod";

type UserGameRow = {
  playtimeMinutes: number | null;
  unlockedAchievementCount: number;
  totalAchievementCount: number;
  completionPercentage: number;
  perfected: boolean;
  customBoxArtUrl: string | null;
  customBannerUrl: string | null;
  lastPlayedAt: Date | null;
  lastSyncedAt: Date | null;
  game: {
    id: string;
    steamAppId: number;
    name: string;
    genres?: string[];
    developers?: string[];
    publishers?: string[];
    capsuleImageUrl: string | null;
    headerImageUrl: string | null;
    hasPaidDlc: boolean;
    fastestCompletionTime: number | null;
    medianCompletionTime: number | null;
    _count?: { achievements: number };
  };
};

type AchievementRow = {
  id: string;
  gameId: string;
  apiName: string;
  displayName: string;
  description: string | null;
  hidden: boolean;
  lockedIconUrl: string | null;
  unlockedIconUrl: string | null;
  globalCompletionPercentage: number | null;
  achievementGroupName: string | null;
  achievementGroupSort: number;
  achievementGroupSteamAppId: number | null;
  obtainability: number;
  game: {
    steamAppId: number;
  };
  userAchievements: { unlocked: boolean; unlockedAt: Date | null }[];
  pinnedAchievements: { id: string }[];
};

function isSkippableSteamGameError(error: unknown) {
  return (
    (error instanceof AppError &&
      (error.code === "STEAM_PERMANENT" ||
        error.code === "STEAM_TEMPORARY" ||
        error.code === "PRIVATE_PROFILE")) ||
    error instanceof z.ZodError
  );
}

const preferencesSchema = z.object({
  spoilerMode: z.enum(["hide", "show"]).default(defaultPreferences.spoilerMode),
  libraryView: z
    .enum(["cards", "list"])
    .default(defaultPreferences.libraryView),
  defaultSort: z
    .enum(["completion", "remaining", "recent", "playtime", "name"])
    .default(defaultPreferences.defaultSort),
  rarityThresholds: z
    .object({
      common: z.number().min(0).max(100),
      uncommon: z.number().min(0).max(100),
      rare: z.number().min(0).max(100),
    })
    .default(defaultPreferences.rarityThresholds),
  theme: z.enum(themePreferences).default(defaultPreferences.theme),
});

function preferences(value: unknown): UserPreferences {
  return preferencesSchema.parse({ ...defaultPreferences, ...(value ?? {}) });
}

function visibility(value: string): VisibilityState {
  if (value === "PUBLIC") return "public";
  if (value === "PRIVATE") return "private";
  if (value === "FRIENDS_ONLY") return "friends_only";
  return "unknown";
}

function prismaVisibility(value: VisibilityState) {
  if (value === "public") return "PUBLIC";
  if (value === "private") return "PRIVATE";
  if (value === "friends_only") return "FRIENDS_ONLY";
  return "UNKNOWN";
}

function gameSummary(row: UserGameRow): GameSummary {
  return {
    id: row.game.id,
    appId: row.game.steamAppId,
    name: row.game.name,
    genres: row.game.genres ?? [],
    developers: row.game.developers ?? [],
    publishers: row.game.publishers ?? [],
    capsuleImageUrl:
      row.customBoxArtUrl ?? row.game.capsuleImageUrl ?? undefined,
    headerImageUrl: row.customBannerUrl ?? row.game.headerImageUrl ?? undefined,
    playtimeMinutes: row.playtimeMinutes ?? undefined,
    unlockedAchievementCount: row.unlockedAchievementCount,
    totalAchievementCount: row.totalAchievementCount,
    unobtainableAchievementCount: row.game._count?.achievements ?? 0,
    completionPercentage: row.completionPercentage,
    perfected: row.perfected,
    hasPaidDlc: row.game.hasPaidDlc,
    fastestCompletionTime: row.game.fastestCompletionTime ?? undefined,
    medianCompletionTime: row.game.medianCompletionTime ?? undefined,
    lastPlayedAt: row.lastPlayedAt?.toISOString(),
    lastSyncedAt: row.lastSyncedAt?.toISOString(),
    hasAchievementData: row.totalAchievementCount > 0,
  };
}

function dashboardCompletionDelta(current: number, previous: number) {
  return Math.round((current - previous) * 10) / 10;
}

function achievementView(
  row: AchievementRow,
  thresholds = productConfig.rarityThresholds,
): AchievementView {
  const userAchievement = row.userAchievements[0];
  const pinned = row.pinnedAchievements[0];
  const imageUrl = (value: string | null) =>
    value && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(value) ? value : undefined;
  return {
    id: row.id,
    gameId: row.gameId,
    appId: row.game.steamAppId,
    apiName: row.apiName,
    displayName: row.displayName,
    description: row.description ?? undefined,
    hidden: row.hidden,
    lockedIconUrl: imageUrl(row.lockedIconUrl),
    unlockedIconUrl: imageUrl(row.unlockedIconUrl),
    globalCompletionPercentage: row.globalCompletionPercentage ?? undefined,
    achievementGroupName: row.achievementGroupName ?? undefined,
    achievementGroupSort: row.achievementGroupSort,
    achievementGroupSteamAppId: row.achievementGroupSteamAppId ?? undefined,
    obtainability: row.obtainability,
    rarity: classifyRarity(
      row.globalCompletionPercentage ?? undefined,
      thresholds,
    ),
    unlocked: userAchievement?.unlocked ?? false,
    unlockedAt: userAchievement?.unlockedAt?.toISOString(),
    pinnedId: pinned?.id,
  };
}

function capsule(appId: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

function header(appId: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}

async function bounded<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let index = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const current = index;
        index += 1;
        const item = items[current];
        if (!item) return;
        results[current] = await worker(item);
      }
    },
  );
  await Promise.all(runners);
  return results;
}

export const prismaRepository: AppRepository = {
  async getOrCreateUserBySteamId(steamId) {
    const user = await prisma.user.upsert({
      where: { steamId },
      update: { lastLoginAt: new Date() },
      create: {
        steamId,
        lastLoginAt: new Date(),
        preferences: defaultPreferences,
      },
    });

    return {
      id: user.id,
      steamId: user.steamId,
      csrfToken: crypto.randomUUID(),
    };
  },

  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { steamProfile: true },
    });
    if (!user)
      throw new AppError("AUTH_REQUIRED", "Session user not found.", 401);

    const profile = user.steamProfile;
    return {
      steamId: user.steamId,
      displayName: profile?.displayName ?? "Steam player",
      avatarSmallUrl: profile?.avatarSmallUrl ?? undefined,
      avatarMediumUrl: profile?.avatarMediumUrl ?? undefined,
      avatarFullUrl: profile?.avatarFullUrl ?? undefined,
      profileUrl: profile?.profileUrl ?? undefined,
      visibilityState: visibility(profile?.visibilityState ?? "UNKNOWN"),
      lastSyncedAt: profile?.lastSyncedAt?.toISOString(),
    };
  },

  async getGames(userId) {
    const rows = await prisma.userGame.findMany({
      where: { userId, hidden: false },
      include: {
        game: {
          include: {
            _count: {
              select: { achievements: { where: { obtainability: 3 } } },
            },
          },
        },
      },
      orderBy: [{ completionPercentage: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(gameSummary);
  },

  async getAchievementsByAppId(userId) {
    const prefs = await this.getPreferences(userId);
    const rows: AchievementRow[] = await prisma.achievement.findMany({
      where: {
        game: { userGames: { some: { userId, hidden: false } } },
      },
      include: {
        game: { select: { steamAppId: true } },
        userAchievements: { where: { userId } },
        pinnedAchievements: {
          where: { userId, state: { not: "ARCHIVED" } },
          select: { id: true },
        },
      },
    });
    return rows.reduce<Record<number, AchievementView[]>>((acc, row) => {
      const appId = row.game.steamAppId;
      acc[appId] ??= [];
      acc[appId].push(achievementView(row, prefs.rarityThresholds));
      return acc;
    }, {});
  },

  async getSuggestedAchievements(userId, limit) {
    const prefs = await this.getPreferences(userId);
    const rows: AchievementRow[] = await prisma.achievement.findMany({
      where: {
        game: { userGames: { some: { userId, hidden: false } } },
        userAchievements: { none: { userId, unlocked: true } },
      },
      include: {
        game: { select: { steamAppId: true } },
        userAchievements: { where: { userId } },
        pinnedAchievements: {
          where: { userId, state: { not: "ARCHIVED" } },
          select: { id: true },
        },
      },
      orderBy: [
        { globalCompletionPercentage: { sort: "desc", nulls: "last" } },
        { displayName: "asc" },
      ],
      take: limit,
    });
    return rows.map((row) => achievementView(row, prefs.rarityThresholds));
  },

  async getGameDetail(userId, appId) {
    const userGame = await prisma.userGame.findFirst({
      where: { userId, hidden: false, game: { steamAppId: appId } },
      include: {
        game: {
          include: {
            _count: {
              select: { achievements: { where: { obtainability: 3 } } },
            },
            achievements: {
              include: {
                game: { select: { steamAppId: true } },
                userAchievements: { where: { userId } },
                pinnedAchievements: {
                  where: { userId, state: { not: "ARCHIVED" } },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userGame) throw new AppError("NOT_FOUND", "Game not found.", 404);
    const prefs = await this.getPreferences(userId);
    return {
      game: gameSummary(userGame),
      achievements: userGame.game.achievements.map((achievement) =>
        achievementView(achievement, prefs.rarityThresholds),
      ),
    };
  },

  async hideGame(userId, appId, hidden) {
    const result = await prisma.userGame.updateMany({
      where: { userId, game: { steamAppId: appId } },
      data: { hidden },
    });
    if (!result.count) throw new AppError("NOT_FOUND", "Game not found.", 404);
  },

  async updateGameBoxArt(userId, appId, imageUrl) {
    const userGame = await prisma.userGame.findFirst({
      where: { userId, game: { steamAppId: appId } },
      include: { game: true },
    });
    if (!userGame) throw new AppError("NOT_FOUND", "Game not found.", 404);

    const updated = await prisma.userGame.update({
      where: { id: userGame.id },
      data: { customBoxArtUrl: imageUrl },
      include: {
        game: {
          include: {
            _count: {
              select: { achievements: { where: { obtainability: 3 } } },
            },
          },
        },
      },
    });
    return gameSummary(updated);
  },

  async updateGameBanner(userId, appId, imageUrl) {
    const userGame = await prisma.userGame.findFirst({
      where: { userId, game: { steamAppId: appId } },
      include: { game: true },
    });
    if (!userGame) throw new AppError("NOT_FOUND", "Game not found.", 404);

    const updated = await prisma.userGame.update({
      where: { id: userGame.id },
      data: { customBannerUrl: imageUrl },
      include: {
        game: {
          include: {
            _count: {
              select: { achievements: { where: { obtainability: 3 } } },
            },
          },
        },
      },
    });
    return gameSummary(updated);
  },

  async getDashboard(userId) {
    const [profile, games, sync] = await Promise.all([
      this.getProfile(userId),
      this.getGames(userId),
      prisma.syncRecord.findFirst({
        where: { userId, status: "SUCCESS" },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    const gamesWithAchievements = games.filter(
      (game) => game.hasAchievementData,
    );
    const totalUnlocked = gamesWithAchievements.reduce(
      (sum, game) => sum + game.unlockedAchievementCount,
      0,
    );
    const totalAchievements = gamesWithAchievements.reduce(
      (sum, game) => sum + game.totalAchievementCount,
      0,
    );
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthUnlockedRows = await prisma.userAchievement.groupBy({
      by: ["unlocked"],
      where: {
        userId,
        unlockedAt: { gte: lastMonth },
        achievement: {
          game: { userGames: { some: { userId, hidden: false } } },
        },
      },
      _count: true,
    });
    const monthUnlocked =
      lastMonthUnlockedRows.find((row) => row.unlocked)?._count ?? 0;
    const monthLocked =
      lastMonthUnlockedRows.find((row) => !row.unlocked)?._count ?? 0;
    const monthPerfected = gamesWithAchievements.filter(
      (game) =>
        game.perfected &&
        game.lastSyncedAt &&
        new Date(game.lastSyncedAt) >= lastMonth,
    ).length;
    const monthGamesWithAchievements = gamesWithAchievements.filter(
      (game) => game.lastSyncedAt && new Date(game.lastSyncedAt) >= lastMonth,
    ).length;
    const monthCompletion = completionPercentage(
      totalUnlocked - monthUnlocked,
      totalAchievements - monthUnlocked - monthLocked,
    );
    const recentRows = await prisma.userAchievement.findMany({
      where: {
        userId,
        unlocked: true,
        unlockedAt: { not: null },
        achievement: {
          game: { userGames: { some: { userId, hidden: false } } },
        },
      },
      orderBy: { unlockedAt: "desc" },
      take: 6,
      include: {
        achievement: {
          include: {
            game: { select: { id: true, name: true, steamAppId: true } },
            userAchievements: { where: { userId } },
            pinnedAchievements: {
              where: { userId, state: { not: "ARCHIVED" } },
              select: { id: true },
            },
          },
        },
      },
    });
    const prefs = await this.getPreferences(userId);
    const recentAchievements: RecentAchievement[] = recentRows.map((row) => ({
      ...achievementView(
        {
          ...row.achievement,
          game: { steamAppId: row.achievement.game.steamAppId },
        },
        prefs.rarityThresholds,
      ),
      gameName: row.achievement.game.name,
    }));
    const activityMap = new Map<string, number>();
    recentRows.forEach((row) => {
      const day = row.unlockedAt!.toISOString().slice(0, 10);
      activityMap.set(day, (activityMap.get(day) ?? 0) + 1);
    });

    return {
      profile,
      privateProfile: profile.visibilityState === "private",
      totalUnlocked,
      totalAchievements,
      remainingAchievements: Math.max(0, totalAchievements - totalUnlocked),
      overallCompletionPercentage: completionPercentage(
        totalUnlocked,
        totalAchievements,
      ),
      perfectedGameCount: gamesWithAchievements.filter((game) => game.perfected)
        .length,
      gamesWithAchievements: gamesWithAchievements.length,
      monthChange: {
        unlocked: monthUnlocked,
        remaining: monthLocked - monthUnlocked,
        perfected: monthPerfected,
        gamesWithAchievements: monthGamesWithAchievements,
        recentUnlocks: monthUnlocked,
        completionPercentage: dashboardCompletionDelta(
          completionPercentage(totalUnlocked, totalAchievements),
          monthCompletion,
        ),
      },
      closestGames: gamesWithAchievements
        .filter((game) => !game.perfected)
        .sort((a, b) => b.completionPercentage - a.completionPercentage)
        .slice(0, 4),
      recentAchievements,
      activity: Array.from(activityMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, unlocked]) => ({ date, unlocked })),
      lastSuccessfulSyncAt: sync?.completedAt?.toISOString(),
      stale:
        !sync?.completedAt ||
        Date.now() - sync.completedAt.getTime() > 86_400_000,
    };
  },

  async getPlanner(userId) {
    const pins = await prisma.pinnedAchievement.findMany({
      where: { userId, state: { not: "ARCHIVED" } },
      orderBy: { position: "asc" },
      include: {
        achievement: {
          include: {
            game: {
              include: {
                userGames: { where: { userId, hidden: false }, take: 1 },
              },
            },
            userAchievements: { where: { userId } },
            pinnedAchievements: { where: { userId }, select: { id: true } },
          },
        },
      },
    });
    const prefs = await this.getPreferences(userId);

    return pins.flatMap((pin) => {
      const userGame = pin.achievement.game.userGames[0];
      if (!userGame) return [];
      return [
        {
          id: pin.id,
          achievement: achievementView(
            {
              ...pin.achievement,
              game: { steamAppId: pin.achievement.game.steamAppId },
            },
            prefs.rarityThresholds,
          ),
          game: gameSummary({ ...userGame, game: pin.achievement.game }),
          notes: pin.notes,
          manualProgressText: pin.manualProgressText,
          priority: pin.priority.toLowerCase() as PlannerItem["priority"],
          state: pin.state.toLowerCase() as PlannerItem["state"],
          position: pin.position,
          createdAt: pin.createdAt.toISOString(),
        },
      ];
    });
  },

  async getPreferences(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    if (!user)
      throw new AppError("AUTH_REQUIRED", "Session user not found.", 401);
    return preferences(user.preferences);
  },

  async updatePreferences(userId, patch) {
    const current = await this.getPreferences(userId);
    const next = preferences({
      ...current,
      ...patch,
      rarityThresholds: {
        ...current.rarityThresholds,
        ...patch.rarityThresholds,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { preferences: next },
    });
    return next;
  },

  async pinAchievement(userId, achievementId) {
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      include: {
        game: {
          include: { userGames: { where: { userId, hidden: false }, take: 1 } },
        },
      },
    });
    const userGame = achievement?.game.userGames[0];
    if (!achievement || !userGame) {
      throw new AppError(
        "FORBIDDEN",
        "Achievement is not available to this user.",
        403,
      );
    }

    const count = await prisma.pinnedAchievement.count({ where: { userId } });
    await prisma.pinnedAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      update: { state: "ACTIVE" },
      create: { userId, achievementId, position: count },
    });
    return (await this.getPlanner(userId)).find(
      (item) => item.achievement.id === achievementId,
    )!;
  },

  async updatePin(userId, pinId, patch: PinPatch) {
    await prisma.pinnedAchievement.update({
      where: { id: pinId, userId },
      data: {
        notes: patch.notes,
        manualProgressText: patch.manualProgressText,
        priority: patch.priority?.toUpperCase() as
          "LOW" | "MEDIUM" | "HIGH" | undefined,
        state: patch.state?.toUpperCase() as
          "ACTIVE" | "COMPLETED" | "ARCHIVED" | undefined,
      },
    });
    const pin = (await this.getPlanner(userId)).find(
      (item) => item.id === pinId,
    );
    if (!pin && patch.state === "archived") {
      throw new AppError("NOT_FOUND", "Pinned achievement was archived.", 404);
    }
    if (!pin)
      throw new AppError("NOT_FOUND", "Pinned achievement not found.", 404);
    return pin;
  },

  async removePin(userId, pinId) {
    await prisma.pinnedAchievement.update({
      where: { id: pinId, userId },
      data: { state: "ARCHIVED" },
    });
  },

  async reorderPins(userId, pinIds) {
    await prisma.$transaction(
      pinIds.map((pinId, position) =>
        prisma.pinnedAchievement.update({
          where: { id: pinId, userId },
          data: { position },
        }),
      ),
    );
    return this.getPlanner(userId);
  },

  async deleteAccount(userId) {
    await prisma.user.delete({ where: { id: userId } });
  },

  async exportAccount(userId) {
    const [profile, games, planner, preferencesValue] = await Promise.all([
      this.getProfile(userId),
      this.getGames(userId),
      this.getPlanner(userId),
      this.getPreferences(userId),
    ]);
    return {
      product: productConfig.name,
      profile,
      games,
      planner,
      preferences: preferencesValue,
      exportedAt: new Date().toISOString(),
    };
  },

  async getSyncStatus(userId) {
    const record = await prisma.syncRecord.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
    });
    if (!record) {
      return {
        running: false,
        status: "idle",
        message: "No sync has run yet.",
        currentGames: 0,
        totalGames: 0,
        progressPercentage: 0,
        gamesUpdated: 0,
        achievementsUpdated: 0,
      };
    }
    if (record.status === "RUNNING") {
      return {
        running: false,
        status: "failure",
        startedAt: record.startedAt.toISOString(),
        completedAt: record.completedAt?.toISOString(),
        message: "Previous sync was interrupted. Start sync again.",
        currentGames: 0,
        totalGames: 0,
        progressPercentage: 0,
        gamesUpdated: record.gamesUpdated,
        achievementsUpdated: record.achievementsUpdated,
      };
    }
    return {
      running: false,
      status: record.status.toLowerCase() as SyncStatusView["status"],
      startedAt: record.startedAt.toISOString(),
      completedAt: record.completedAt?.toISOString(),
      message: record.errorSummary ?? "Last sync completed.",
      currentGames: 0,
      totalGames: 0,
      progressPercentage: 0,
      gamesUpdated: record.gamesUpdated,
      achievementsUpdated: record.achievementsUpdated,
    };
  },

  async setSyncStatus(userId, status) {
    await prisma.syncRecord.create({
      data: {
        userId,
        syncType: "FULL",
        status: status.status.toUpperCase() as
          "RUNNING" | "SUCCESS" | "FAILURE",
        completedAt: status.completedAt
          ? new Date(status.completedAt)
          : undefined,
        errorSummary: status.message,
        gamesUpdated: status.gamesUpdated,
        achievementsUpdated: status.achievementsUpdated,
      },
    });
  },

  async syncSteamUser(user, adapter: SteamAdapter, onProgress) {
    const startedAt = new Date();
    const record = await prisma.syncRecord.create({
      data: { userId: user.id, syncType: "FULL", status: "RUNNING", startedAt },
    });

    try {
      const profile = await adapter.getProfile(user.steamId);
      await prisma.steamProfile.upsert({
        where: { userId: user.id },
        update: {
          displayName: profile.displayName,
          avatarSmallUrl: profile.avatarSmallUrl,
          avatarMediumUrl: profile.avatarMediumUrl,
          avatarFullUrl: profile.avatarFullUrl,
          profileUrl: profile.profileUrl,
          visibilityState: prismaVisibility(profile.visibilityState),
          lastSyncedAt: new Date(),
        },
        create: {
          userId: user.id,
          displayName: profile.displayName,
          avatarSmallUrl: profile.avatarSmallUrl,
          avatarMediumUrl: profile.avatarMediumUrl,
          avatarFullUrl: profile.avatarFullUrl,
          profileUrl: profile.profileUrl,
          visibilityState: prismaVisibility(profile.visibilityState),
          lastSyncedAt: new Date(),
        },
      });

      if (profile.visibilityState === "private") {
        throw new AppError(
          "PRIVATE_PROFILE",
          "Profile details synced, but game and achievement data is private.",
          200,
        );
      }

      const owned = await adapter.getOwnedGames(user.steamId);
      if (owned.unavailable) {
        throw new AppError(
          "PRIVATE_PROFILE",
          "Owned games are unavailable. Check Steam privacy settings.",
          200,
        );
      }

      let achievementsUpdated = 0;
      let gamesUpdated = 0;
      let processedGames = 0;
      const candidateGames = owned.games;
      onProgress?.({ currentGames: 0, totalGames: candidateGames.length });
      await bounded(
        candidateGames,
        productConfig.sync.concurrency,
        async (ownedGame) => {
          try {
            const steamHuntersApp = await getSteamHuntersAppMeta(
              ownedGame.appId,
            );
            const steamHuntersGameData = steamHuntersApp
              ? {
                  hasPaidDlc: steamHuntersApp.hasPaidDlc,
                  fastestCompletionTime: steamHuntersApp.fastestCompletionTime,
                  medianCompletionTime: steamHuntersApp.medianCompletionTime,
                  steamHuntersSyncedAt: new Date(),
                }
              : {};
            const game = await prisma.game.upsert({
              where: { steamAppId: ownedGame.appId },
              update: {
                name: ownedGame.name ?? `App ${ownedGame.appId}`,
                capsuleImageUrl: capsule(ownedGame.appId),
                headerImageUrl: header(ownedGame.appId),
                ...steamHuntersGameData,
              },
              create: {
                steamAppId: ownedGame.appId,
                name: ownedGame.name ?? `App ${ownedGame.appId}`,
                capsuleImageUrl: capsule(ownedGame.appId),
                headerImageUrl: header(ownedGame.appId),
                ...steamHuntersGameData,
              },
            });

            const schema = await adapter.getAchievementSchema(ownedGame.appId);
            if (!schema.achievements.length) return;

            const [playerAchievements, globalPercentages] = await Promise.all([
              adapter
                .getPlayerAchievements(user.steamId, ownedGame.appId)
                .catch((error) => {
                  if (isSkippableSteamGameError(error)) return [];
                  throw error;
                }),
              adapter.getGlobalAchievementPercentages(ownedGame.appId),
            ]);
            const [achievementGroups, achievementMeta] = await Promise.all([
              getAchievementGroups(ownedGame.appId),
              getSteamHuntersAchievementMeta(ownedGame.appId),
            ]);
            const progressByName = new Map(
              playerAchievements.map((item) => [item.apiName, item]),
            );
            const rarityByName = new Map(
              globalPercentages.map((item) => [item.apiName, item.percent]),
            );
            let unlocked = 0;

            for (const item of schema.achievements) {
              const progress = progressByName.get(item.apiName);
              if (progress?.unlocked) unlocked += 1;
              const group = achievementGroups?.get(item.apiName);
              const meta = achievementMeta?.get(item.apiName);
              const groupData = achievementGroups
                ? {
                    achievementGroupName: group?.name,
                    achievementGroupSort: group?.sort ?? 0,
                    achievementGroupSteamAppId: group?.steamAppId,
                    achievementGroupLastSyncedAt: new Date(),
                  }
                : {};
              const metaData = achievementMeta
                ? {
                    obtainability: meta?.obtainability ?? 0,
                    obtainabilityLastSyncedAt: new Date(),
                  }
                : {};
              const achievement = await prisma.achievement.upsert({
                where: {
                  gameId_apiName: { gameId: game.id, apiName: item.apiName },
                },
                update: {
                  displayName: item.displayName,
                  description: item.description,
                  hidden: item.hidden,
                  lockedIconUrl: item.lockedIconUrl,
                  unlockedIconUrl: item.unlockedIconUrl,
                  globalCompletionPercentage: rarityByName.get(item.apiName),
                  globalCompletionLastSyncedAt: new Date(),
                  ...groupData,
                  ...metaData,
                },
                create: {
                  gameId: game.id,
                  apiName: item.apiName,
                  displayName: item.displayName,
                  description: item.description,
                  hidden: item.hidden,
                  lockedIconUrl: item.lockedIconUrl,
                  unlockedIconUrl: item.unlockedIconUrl,
                  globalCompletionPercentage: rarityByName.get(item.apiName),
                  globalCompletionLastSyncedAt: new Date(),
                  achievementGroupName: group?.name,
                  achievementGroupSort: group?.sort ?? 0,
                  achievementGroupSteamAppId: group?.steamAppId,
                  achievementGroupLastSyncedAt: achievementGroups
                    ? new Date()
                    : undefined,
                  obtainability: meta?.obtainability ?? 0,
                  obtainabilityLastSyncedAt: achievementMeta
                    ? new Date()
                    : undefined,
                },
              });

              await prisma.userAchievement.upsert({
                where: {
                  userId_achievementId: {
                    userId: user.id,
                    achievementId: achievement.id,
                  },
                },
                update: {
                  unlocked: progress?.unlocked ?? false,
                  unlockedAt: progress?.unlockedAt
                    ? new Date(progress.unlockedAt)
                    : undefined,
                  lastObservedAt: new Date(),
                },
                create: {
                  userId: user.id,
                  achievementId: achievement.id,
                  unlocked: progress?.unlocked ?? false,
                  unlockedAt: progress?.unlockedAt
                    ? new Date(progress.unlockedAt)
                    : undefined,
                },
              });
            }

            achievementsUpdated += schema.achievements.length;
            await prisma.game.update({
              where: { id: game.id },
              data: {
                totalKnownAchievements: schema.achievements.length,
                lastSchemaSyncedAt: new Date(),
              },
            });
            await prisma.userGame.upsert({
              where: { userId_gameId: { userId: user.id, gameId: game.id } },
              update: {
                playtimeMinutes: ownedGame.playtimeMinutes,
                unlockedAchievementCount: unlocked,
                totalAchievementCount: schema.achievements.length,
                completionPercentage: completionPercentage(
                  unlocked,
                  schema.achievements.length,
                ),
                perfected:
                  schema.achievements.length > 0 &&
                  unlocked === schema.achievements.length,
                lastPlayedAt: ownedGame.lastPlayedAt
                  ? new Date(ownedGame.lastPlayedAt)
                  : undefined,
                lastSyncedAt: new Date(),
              },
              create: {
                userId: user.id,
                gameId: game.id,
                playtimeMinutes: ownedGame.playtimeMinutes,
                unlockedAchievementCount: unlocked,
                totalAchievementCount: schema.achievements.length,
                completionPercentage: completionPercentage(
                  unlocked,
                  schema.achievements.length,
                ),
                perfected:
                  schema.achievements.length > 0 &&
                  unlocked === schema.achievements.length,
                lastPlayedAt: ownedGame.lastPlayedAt
                  ? new Date(ownedGame.lastPlayedAt)
                  : undefined,
                lastSyncedAt: new Date(),
              },
            });
            gamesUpdated += 1;
          } catch (error) {
            if (!isSkippableSteamGameError(error)) throw error;
          } finally {
            processedGames += 1;
            onProgress?.({
              currentGames: processedGames,
              totalGames: candidateGames.length,
            });
          }
        },
      );

      await prisma.syncRecord.update({
        where: { id: record.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          errorSummary: "Sync completed.",
          gamesUpdated,
          achievementsUpdated,
        },
      });

      return { gamesUpdated, achievementsUpdated };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Steam sync failed. Existing data was preserved.";
      await prisma.syncRecord.update({
        where: { id: record.id },
        data: {
          status:
            error instanceof AppError && error.status === 200
              ? "SUCCESS"
              : "FAILURE",
          completedAt: new Date(),
          errorSummary: message,
        },
      });
      if (error instanceof AppError && error.status === 200) {
        return { gamesUpdated: 0, achievementsUpdated: 0 };
      }
      throw error;
    }
  },
};
