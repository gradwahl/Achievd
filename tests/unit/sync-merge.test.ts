import { describe, expect, it } from "vitest";
import { testAchievementsByAppId, testGames } from "../fixtures/app-fixtures";
import { mergeSyncState } from "@/lib/services/sync-merge";

describe("sync merge", () => {
  it("preserves existing data when incoming Steam data is partial", () => {
    const merged = mergeSyncState(
      { games: testGames, achievementsByAppId: testAchievementsByAppId },
      { games: [{ appId: 1, playtimeMinutes: 999 }] },
    );

    const celeste = merged.games.find((game) => game.appId === 1);
    expect(celeste?.name).toBe("Celeste");
    expect(celeste?.playtimeMinutes).toBe(999);
    expect(celeste?.totalAchievementCount).toBe(8);
    expect(merged.achievementsByAppId[1]?.length).toBe(2);
  });
});
