import { afterEach, describe, expect, it, vi } from "vitest";
import { getAchievementGroups } from "@/lib/steam/achievement-groups";

describe("achievement groups", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to known DLC groups when SteamDB blocks grouping data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 403 })));

    const groups = await getAchievementGroups(680420);

    expect(groups?.get("ach_gauss_story_1")).toEqual({
      name: "OUTRIDERS WORLDSLAYER EXPANSION",
      sort: 1,
      steamAppId: 1785250,
    });
    expect(groups?.get("ach_story_1")).toBeUndefined();
  });
});
