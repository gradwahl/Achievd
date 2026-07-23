import { AppError } from "@/lib/errors";
import { getRepository } from "@/lib/repositories";
import { getSteamAdapter } from "@/lib/steam/client";
import type { SessionUser, SyncStatusView } from "@/lib/types";

const running = new Map<string, Promise<void>>();
const runningStatus = new Map<string, SyncStatusView>();

function status(partial: Partial<SyncStatusView>): SyncStatusView {
  return {
    running: false,
    status: "idle",
    message: "No sync has run yet.",
    currentGames: 0,
    totalGames: 0,
    progressPercentage: 0,
    gamesUpdated: 0,
    achievementsUpdated: 0,
    ...partial,
  };
}

export async function startUserSync(user: Pick<SessionUser, "id" | "steamId">) {
  const repository = getRepository();
  if (running.has(user.id)) {
    return runningStatus.get(user.id) ?? repository.getSyncStatus(user.id);
  }

  const startedAt = new Date().toISOString();
  const startedStatus = status({
    running: true,
    status: "running",
    startedAt,
    message: "Sync started. You can keep using the app.",
  });
  runningStatus.set(user.id, startedStatus);
  await repository.setSyncStatus(user.id, startedStatus);

  const job = (async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const adapter = await getSteamAdapter();
      const result = await repository.syncSteamUser(
        user,
        adapter,
        (progress) => {
          const progressPercentage = progress.totalGames
            ? Math.round((progress.currentGames / progress.totalGames) * 100)
            : 0;
          runningStatus.set(
            user.id,
            status({
              running: true,
              status: "running",
              startedAt,
              message: `Syncing games: ${progress.currentGames}/${progress.totalGames}`,
              currentGames: progress.currentGames,
              totalGames: progress.totalGames,
              progressPercentage,
            }),
          );
        },
      );
      await repository.setSyncStatus(
        user.id,
        status({
          status: "success",
          completedAt: new Date().toISOString(),
          message: `Sync completed: ${result.gamesUpdated} achievement games and ${result.achievementsUpdated} achievements updated.`,
          gamesUpdated: result.gamesUpdated,
          achievementsUpdated: result.achievementsUpdated,
        }),
      );
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : "Sync failed. Existing data was preserved.";
      await repository.setSyncStatus(
        user.id,
        status({
          status: "failure",
          completedAt: new Date().toISOString(),
          message,
        }),
      );
    } finally {
      running.delete(user.id);
      runningStatus.delete(user.id);
    }
  })();

  running.set(user.id, job);
  return runningStatus.get(user.id) ?? repository.getSyncStatus(user.id);
}

export async function getUserSyncStatus(userId: string) {
  const current = runningStatus.get(userId);
  if (current) return current;
  return getRepository().getSyncStatus(userId);
}
