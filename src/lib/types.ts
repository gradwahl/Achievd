import type { RarityThresholds } from "@/config/product";

export const themePreferences = [
  "dark",
  "light",
  "system",
  "neon-blue",
  "neon-red",
  "neon-green",
  "neon-yellow",
  "neon-silver",
  "neon-gold",
  "neon-platinum",
  "neon-bronze",
  "neon-pink",
  "neon-purple",
  "neon-indigo",
  "neon-cyan",
  "neon-teal",
] as const;

export type VisibilityState = "public" | "private" | "friends_only" | "unknown";
export type RarityCategory = "common" | "uncommon" | "rare" | "ultra-rare";
export type LibraryView = "cards" | "list";
export type GameSort =
  "completion" | "remaining" | "recent" | "playtime" | "name";
export type ThemePreference = (typeof themePreferences)[number];
export type PinPriority = "low" | "medium" | "high";
export type PinState = "active" | "completed" | "archived";

export type UserPreferences = {
  spoilerMode: "hide" | "show";
  libraryView: LibraryView;
  defaultSort: GameSort;
  rarityThresholds: RarityThresholds;
  theme: ThemePreference;
};

export type SessionUser = {
  id: string;
  steamId: string;
  csrfToken: string;
  username?: string;
};

export type SteamProfileView = {
  steamId: string;
  displayName: string;
  avatarSmallUrl?: string;
  avatarMediumUrl?: string;
  avatarFullUrl?: string;
  profileUrl?: string;
  visibilityState: VisibilityState;
  lastSyncedAt?: string;
};

export type GameSummary = {
  id: string;
  appId: number;
  name: string;
  capsuleImageUrl?: string;
  headerImageUrl?: string;
  playtimeMinutes?: number;
  unlockedAchievementCount: number;
  totalAchievementCount: number;
  completionPercentage: number;
  perfected: boolean;
  lastPlayedAt?: string;
  lastSyncedAt?: string;
  hasAchievementData: boolean;
};

export type AchievementView = {
  id: string;
  gameId: string;
  appId: number;
  apiName: string;
  displayName: string;
  description?: string;
  hidden: boolean;
  lockedIconUrl?: string;
  unlockedIconUrl?: string;
  globalCompletionPercentage?: number;
  rarity: RarityCategory;
  unlocked: boolean;
  unlockedAt?: string;
  pinnedId?: string;
};

export type RecentAchievement = AchievementView & {
  gameName: string;
};

export type DashboardView = {
  profile: SteamProfileView;
  privateProfile: boolean;
  totalUnlocked: number;
  totalAchievements: number;
  remainingAchievements: number;
  overallCompletionPercentage: number;
  perfectedGameCount: number;
  gamesWithAchievements: number;
  monthChange: {
    unlocked: number;
    remaining: number;
    perfected: number;
    gamesWithAchievements: number;
    recentUnlocks: number;
    completionPercentage: number;
  };
  closestGames: GameSummary[];
  recentAchievements: RecentAchievement[];
  activity: { date: string; unlocked: number }[];
  lastSuccessfulSyncAt?: string;
  stale: boolean;
};

export type GameDetailView = {
  game: GameSummary;
  achievements: AchievementView[];
};

export type PlannerItem = {
  id: string;
  achievement: AchievementView;
  game: GameSummary;
  notes: string;
  manualProgressText: string;
  priority: PinPriority;
  state: PinState;
  position: number;
  createdAt: string;
};

export type Recommendation = {
  id: string;
  game: GameSummary;
  label: string;
  explanation: string;
  score: number;
};

export type SyncStatusView = {
  running: boolean;
  status: "idle" | "running" | "success" | "failure";
  startedAt?: string;
  completedAt?: string;
  message: string;
  currentGames: number;
  totalGames: number;
  progressPercentage: number;
  gamesUpdated: number;
  achievementsUpdated: number;
};
