import { describe, expect, it } from "vitest";
import {
  parseOwnedGames,
  parsePlayerSummary,
  parsePlayerAchievements,
  parseAchievementSchema,
  parseGlobalAchievementPercentages,
} from "@/lib/steam/parsers";
import { hasPotentialAchievementStats } from "@/lib/steam/filters";

describe("Steam response parsing", () => {
  it("handles profile visibility and private owned-games state", () => {
    expect(
      parsePlayerSummary({
        response: { players: [{ steamid: "1", communityvisibilitystate: 1 }] },
      }).visibilityState,
    ).toBe("private");
    expect(parseOwnedGames({ response: {} })).toEqual({
      games: [],
      unavailable: true,
    });
  });

  it("normalizes missing fields instead of throwing", () => {
    expect(
      parsePlayerAchievements({ playerstats: { success: false } }),
    ).toEqual([]);
    expect(parseAchievementSchema(10, { game: {} })).toEqual({
      appId: 10,
      gameName: undefined,
      achievements: [],
    });
    expect(
      parseGlobalAchievementPercentages({
        achievementpercentages: { achievements: [{ name: "x", percent: 4.2 }] },
      }),
    ).toEqual([{ apiName: "x", percent: 4.2 }]);
  });

  it("probes games when Steam omits the community stats flag", () => {
    const parsed = parseOwnedGames({
      response: { games: [{ appid: 10, name: "Patchy Steam Game" }] },
    });

    expect(parsed.games.filter(hasPotentialAchievementStats)).toHaveLength(1);
    expect(
      [{ appId: 10, hasCommunityVisibleStats: false }].filter(
        hasPotentialAchievementStats,
      ),
    ).toHaveLength(0);
  });

  it("accepts Steam global percentages as strings", () => {
    expect(
      parseGlobalAchievementPercentages({
        achievementpercentages: {
          achievements: [{ name: "ACH_WIN", percent: "12.5" }],
        },
      }),
    ).toEqual([{ apiName: "ACH_WIN", percent: 12.5 }]);
  });
});
