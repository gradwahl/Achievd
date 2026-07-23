import { describe, expect, it } from "vitest";
import {
  achievementsRemaining,
  classifyRarity,
  completionPercentage,
} from "@/lib/calculations";

describe("achievement calculations", () => {
  it("calculates rounded completion and remaining achievements", () => {
    expect(completionPercentage(2, 3)).toBe(66.7);
    expect(completionPercentage(3, 0)).toBe(0);
    expect(achievementsRemaining(8, 10)).toBe(2);
    expect(achievementsRemaining(12, 10)).toBe(0);
  });

  it("classifies rarity with configurable thresholds", () => {
    expect(classifyRarity(70)).toBe("common");
    expect(classifyRarity(30)).toBe("uncommon");
    expect(classifyRarity(10)).toBe("rare");
    expect(classifyRarity(2)).toBe("ultra-rare");
    expect(classifyRarity(10, { common: 75, uncommon: 40, rare: 10 })).toBe(
      "rare",
    );
  });
});
