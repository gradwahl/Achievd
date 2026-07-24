type SteamDbAchievementGroup = {
  name?: string;
  dlcAppName?: string;
  dlcAppId?: number;
  achievementApiNames?: string[];
};

export type AchievementGroupMeta = {
  name: string;
  sort: number;
  steamAppId?: number;
};

export type SteamHuntersAchievementMeta = {
  obtainability: number;
};

export type SteamHuntersAppMeta = {
  hasPaidDlc: boolean;
  fastestCompletionTime?: number;
  medianCompletionTime?: number;
};

const staticAchievementGroups = new Map<number, SteamDbAchievementGroup[]>([
  [
    680420,
    [
      {
        dlcAppName: "OUTRIDERS WORLDSLAYER EXPANSION",
        dlcAppId: 1785250,
        achievementApiNames: [
          "ach_gauss_story_1",
          "ach_gauss_story_2",
          "ach_gauss_story_end",
          "ach_gauss_dungeon_introductory",
          "ach_gauss_dungeon_finish",
          "ach_gauss_difficulty",
        ],
      },
    ],
  ],
]);

function groupMapFromSteamDbData(data: SteamDbAchievementGroup[]) {
  const groups = new Map<string, AchievementGroupMeta>();
  data.forEach((group, index) => {
    const name = group.dlcAppName ?? group.name;
    if (!name || !Array.isArray(group.achievementApiNames)) return;

    for (const apiName of group.achievementApiNames) {
      groups.set(apiName, {
        name,
        sort: index + 1,
        steamAppId: group.dlcAppId,
      });
    }
  });
  return groups;
}

function staticAchievementGroupMap(appId: number) {
  const groups = staticAchievementGroups.get(appId);
  return groups ? groupMapFromSteamDbData(groups) : null;
}

export async function getSteamHuntersAppMeta(appId: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`https://steamhunters.com/api/apps/${appId}`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const app = (await response.json()) as {
      hasPaidDlc?: boolean;
      fastestCompletionTime?: number;
      medianCompletionTime?: number;
    };

    return {
      hasPaidDlc: app.hasPaidDlc ?? false,
      fastestCompletionTime: app.fastestCompletionTime,
      medianCompletionTime: app.medianCompletionTime,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAchievementGroups(appId: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://extension.steamdb.info/api/ExtensionGetAchievements/?appid=${appId}`,
      {
        headers: {
          Accept: "application/json",
          "X-Requested-With": "SteamDB",
        },
        signal: controller.signal,
      },
    );
    if (!response.ok) return staticAchievementGroupMap(appId);

    const body = (await response.json()) as {
      success?: boolean;
      data?: SteamDbAchievementGroup[];
    };
    if (!body.success || !Array.isArray(body.data)) {
      return staticAchievementGroupMap(appId);
    }

    const groups = groupMapFromSteamDbData(body.data);
    for (const [apiName, group] of staticAchievementGroupMap(appId) ?? []) {
      groups.set(apiName, group);
    }
    return groups;
  } catch {
    return staticAchievementGroupMap(appId);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSteamHuntersAchievementMeta(appId: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://steamhunters.com/api/apps/${appId}/achievements`,
      { signal: controller.signal },
    );
    if (!response.ok) return null;

    const achievements = (await response.json()) as {
      apiName?: string;
      obtainability?: number;
    }[];
    if (!Array.isArray(achievements)) return null;

    const meta = new Map<string, SteamHuntersAchievementMeta>();
    for (const achievement of achievements) {
      if (!achievement.apiName) continue;
      meta.set(achievement.apiName, {
        obtainability: achievement.obtainability ?? 0,
      });
    }
    return meta;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
