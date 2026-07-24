import { describe, expect, it } from "vitest";
import {
  parseOwnedGames,
  parsePlayerSummary,
  parsePlayerAchievements,
  parseAchievementSchema,
  parseCommunityAchievementSchema,
  parseGlobalAchievementPercentages,
  parseSteamLibraryCsv,
  parseStoreDetails,
} from "@/lib/steam/parsers";

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

  it("accepts Steam global percentages as strings", () => {
    expect(
      parseGlobalAchievementPercentages({
        achievementpercentages: {
          achievements: [{ name: "ACH_WIN", percent: "12.5" }],
        },
      }),
    ).toEqual([{ apiName: "ACH_WIN", percent: 12.5 }]);
  });

  it("parses Steam Store genres", () => {
    expect(
      parseStoreDetails(10, {
        "10": {
          success: true,
          data: {
            developers: ["Valve"],
            genres: [{ description: "Action" }, { description: "RPG" }, {}],
            publishers: ["Valve"],
          },
        },
      }),
    ).toEqual({
      developers: ["Valve"],
      genres: ["Action", "RPG"],
      publishers: ["Valve"],
    });
  });

  it("parses Steam library CSV achievement exports", () => {
    const csv =
      "game,id,hours,steam achievements\n" +
      "Raise the Colours,4008340,6.083333333333333,x\n" +
      "No Trophies,1,2,\n";

    expect(parseSteamLibraryCsv(csv)).toEqual([
      {
        appId: 4008340,
        name: "Raise the Colours",
        playtimeMinutes: 365,
      },
    ]);
  });

  it("builds a schema from Steam community achievements markup", () => {
    const parsed = parseCommunityAchievementSchema(
      4008340,
      '<div class="achieveImgHolder"><img src="https://cdn.example/a.jpg" /></div><div class="achieveTxt"><h3>Kettle&amp;Tea</h3><h5>Launch RTC</h5></div>',
      [{ apiName: "OPEN_GAME_ACHIEVEMENT_1", percent: 15.7 }],
    );

    expect(parsed.achievements).toEqual([
      {
        apiName: "OPEN_GAME_ACHIEVEMENT_1",
        displayName: "Kettle&Tea",
        description: "Launch RTC",
        hidden: false,
        lockedIconUrl: "https://cdn.example/a.jpg",
        unlockedIconUrl: "https://cdn.example/a.jpg",
      },
    ]);
  });

  it("drops Steam achievement folder URLs without image filenames", () => {
    const parsed = parseAchievementSchema(201810, {
      game: {
        availableGameStats: {
          achievements: [
            {
              name: "ACH_GUNNER",
              icon: "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/201810/icon.jpg",
              icongray:
                "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/201810/",
            },
          ],
        },
      },
    });

    expect(parsed.achievements[0]?.lockedIconUrl).toBeUndefined();
    expect(parsed.achievements[0]?.unlockedIconUrl).toMatch(/icon\.jpg$/);
  });
});
