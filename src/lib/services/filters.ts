import type {
  AchievementView,
  GameSort,
  GameSummary,
  RarityCategory,
} from "@/lib/types";

export type GameFilter = "all" | "perfected" | "incomplete" | "unobtainable";
export type GameTagFilter = {
  type: "genre" | "developer" | "publisher";
  value: string;
};
export type AchievementFilter = "all" | "locked" | "unlocked" | "unobtainable";
export type AchievementSort = "rarity" | "alpha" | "unlocked" | "locked-first";

export function filterGames(
  games: GameSummary[],
  options: {
    search?: string;
    filter?: GameFilter;
    sort?: GameSort;
    tag?: GameTagFilter;
  },
) {
  const search = options.search?.trim().toLowerCase() ?? "";
  const tag = options.tag;
  return games
    .filter((game) => !search || game.name.toLowerCase().includes(search))
    .filter((game) => {
      if (!tag) return true;
      const values =
        tag.type === "genre"
          ? game.genres
          : tag.type === "developer"
            ? game.developers
            : game.publishers;
      return values.some((value) => value === tag.value);
    })
    .filter((game) => {
      if (options.filter === "perfected") return game.perfected;
      if (options.filter === "incomplete") {
        return game.hasAchievementData && !game.perfected;
      }
      if (options.filter === "unobtainable") {
        return game.unobtainableAchievementCount > 0;
      }
      return true;
    })
    .sort((a, b) => {
      if (options.sort === "remaining") {
        return (
          a.totalAchievementCount -
          a.unlockedAchievementCount -
          (b.totalAchievementCount - b.unlockedAchievementCount)
        );
      }
      if (options.sort === "recent") {
        return (
          new Date(b.lastPlayedAt ?? 0).getTime() -
          new Date(a.lastPlayedAt ?? 0).getTime()
        );
      }
      if (options.sort === "playtime") {
        return (b.playtimeMinutes ?? 0) - (a.playtimeMinutes ?? 0);
      }
      if (options.sort === "name") return a.name.localeCompare(b.name);
      return b.completionPercentage - a.completionPercentage;
    });
}

export function filterAchievements(
  achievements: AchievementView[],
  options: {
    search?: string;
    filter?: AchievementFilter;
    rarity?: RarityCategory | "all";
    sort?: AchievementSort;
  },
) {
  const search = options.search?.trim().toLowerCase() ?? "";
  return achievements
    .filter(
      (achievement) =>
        !search ||
        achievement.displayName.toLowerCase().includes(search) ||
        achievement.description?.toLowerCase().includes(search),
    )
    .filter((achievement) => {
      if (options.filter === "locked") return !achievement.unlocked;
      if (options.filter === "unlocked") return achievement.unlocked;
      if (options.filter === "unobtainable") {
        return achievement.obtainability === 3;
      }
      return true;
    })
    .filter((achievement) => {
      if (!options.rarity || options.rarity === "all") return true;
      return achievement.rarity === options.rarity;
    })
    .sort((a, b) => {
      if (options.sort === "alpha")
        return a.displayName.localeCompare(b.displayName);
      if (options.sort === "unlocked") {
        return (
          new Date(b.unlockedAt ?? 0).getTime() -
          new Date(a.unlockedAt ?? 0).getTime()
        );
      }
      if (options.sort === "locked-first") {
        return Number(a.unlocked) - Number(b.unlocked);
      }
      return (
        (a.globalCompletionPercentage ?? Number.POSITIVE_INFINITY) -
        (b.globalCompletionPercentage ?? Number.POSITIVE_INFINITY)
      );
    });
}
