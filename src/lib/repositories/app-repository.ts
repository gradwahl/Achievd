import type { SteamAdapter } from "@/lib/steam/types";
import type {
  AchievementView,
  DashboardView,
  GameDetailView,
  GameSummary,
  PlannerItem,
  SessionUser,
  SteamProfileView,
  SyncStatusView,
  UserPreferences,
} from "@/lib/types";

export type PinPatch = Partial<
  Pick<PlannerItem, "notes" | "manualProgressText" | "priority" | "state">
>;

export type AppRepository = {
  getOrCreateUserBySteamId(steamId: string): Promise<SessionUser>;
  getProfile(userId: string): Promise<SteamProfileView>;
  getDashboard(userId: string): Promise<DashboardView>;
  getGames(userId: string): Promise<GameSummary[]>;
  getAchievementsByAppId(
    userId: string,
  ): Promise<Record<number, AchievementView[]>>;
  getSuggestedAchievements(
    userId: string,
    limit: number,
  ): Promise<AchievementView[]>;
  getGameDetail(userId: string, appId: number): Promise<GameDetailView>;
  hideGame(userId: string, appId: number, hidden: boolean): Promise<void>;
  updateGameBoxArt(
    userId: string,
    appId: number,
    imageUrl: string | null,
  ): Promise<GameSummary>;
  updateGameBanner(
    userId: string,
    appId: number,
    imageUrl: string | null,
  ): Promise<GameSummary>;
  getPlanner(userId: string): Promise<PlannerItem[]>;
  getPreferences(userId: string): Promise<UserPreferences>;
  updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences>;
  pinAchievement(userId: string, achievementId: string): Promise<PlannerItem>;
  updatePin(
    userId: string,
    pinId: string,
    patch: PinPatch,
  ): Promise<PlannerItem>;
  removePin(userId: string, pinId: string): Promise<void>;
  reorderPins(userId: string, pinIds: string[]): Promise<PlannerItem[]>;
  deleteAccount(userId: string): Promise<void>;
  exportAccount(userId: string): Promise<unknown>;
  getSyncStatus(userId: string): Promise<SyncStatusView>;
  setSyncStatus(userId: string, status: SyncStatusView): Promise<void>;
  syncSteamUser(
    user: Pick<SessionUser, "id" | "steamId">,
    adapter: SteamAdapter,
    onProgress?: (progress: {
      currentGames: number;
      totalGames: number;
    }) => void,
  ): Promise<{ gamesUpdated: number; achievementsUpdated: number }>;
};
