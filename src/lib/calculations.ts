import { productConfig, type RarityThresholds } from "@/config/product";
import type { RarityCategory } from "@/lib/types";

export function completionPercentage(unlocked: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((unlocked / total) * 1000) / 10;
}

export function achievementsRemaining(unlocked: number, total: number) {
  return Math.max(0, total - unlocked);
}

export function classifyRarity(
  percent: number | undefined,
  thresholds: RarityThresholds = productConfig.rarityThresholds,
): RarityCategory {
  if (percent === undefined || percent < thresholds.rare) return "ultra-rare";
  if (percent < thresholds.uncommon) return "rare";
  if (percent < thresholds.common) return "uncommon";
  return "common";
}

export function rarityLabel(category: RarityCategory) {
  return category
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("-");
}
