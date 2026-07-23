import type { UserPreferences } from "@/lib/types";

export const defaultPreferences: UserPreferences = {
  spoilerMode: "hide",
  libraryView: "cards",
  defaultSort: "completion",
  rarityThresholds: {
    common: 50,
    uncommon: 20,
    rare: 5,
  },
  theme: "dark",
};
