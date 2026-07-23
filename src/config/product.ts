export type RarityThresholds = {
  common: number;
  uncommon: number;
  rare: number;
};

export const productConfig: {
  name: string;
  cookieName: string;
  steamApiKeyCookieName: string;
  csrfHeader: string;
  rarityThresholds: RarityThresholds;
  sync: {
    schemaCacheDays: number;
    rarityCacheHours: number;
    concurrency: number;
  };
} = {
  name: "Achievd",
  cookieName: "ac_session",
  steamApiKeyCookieName: "ac_steam_api_key",
  csrfHeader: "x-csrf-token",
  rarityThresholds: {
    common: 50,
    uncommon: 20,
    rare: 5,
  },
  sync: {
    schemaCacheDays: 7,
    rarityCacheHours: 24,
    concurrency: 3,
  },
};
