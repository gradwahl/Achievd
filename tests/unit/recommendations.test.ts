import { describe, expect, it, vi } from "vitest";
import { testAchievementsByAppId, testGames } from "../fixtures/app-fixtures";
import { buildRecommendations } from "@/lib/services/recommendations";

describe("recommendations", () => {
  it("returns deterministic reasons without claiming machine learning", () => {
    vi.setSystemTime(new Date("2026-07-23T12:00:00.000Z"));

    const recommendations = buildRecommendations(
      testGames,
      testAchievementsByAppId,
    );

    expect(recommendations[0]?.label).toBe("Closest to completion");
    expect(recommendations.map((item) => item.explanation).join(" ")).toContain(
      "achievements remaining",
    );
    expect(
      recommendations.map((item) => item.explanation).join(" "),
    ).not.toMatch(/machine learning|artificial intelligence/i);

    vi.useRealTimers();
  });
});
