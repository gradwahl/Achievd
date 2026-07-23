import { requireSession } from "@/lib/auth/session";
import { getGamesData, getSettingsData } from "@/lib/services/app-service";
import { AppShell } from "@/components/layout/app-shell";
import { GameLibraryClient } from "@/components/games/game-library-client";

export default async function GamesPage() {
  const session = await requireSession();
  const [games, preferences] = await Promise.all([
    getGamesData(session.id),
    getSettingsData(session.id),
  ]);

  return (
    <AppShell session={session}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Game Library</h1>
          <p className="mt-2 text-sm text-slate-400">
            Find the games closest to 100%, stalled progress, and titles without
            achievement data.
          </p>
        </div>
        <GameLibraryClient
          games={games}
          defaultSort={preferences.defaultSort}
          csrfToken={session.csrfToken}
        />
      </div>
    </AppShell>
  );
}
