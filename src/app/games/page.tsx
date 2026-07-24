import { requireSession } from "@/lib/auth/session";
import { getGamesData } from "@/lib/services/app-service";
import { AppShell } from "@/components/layout/app-shell";
import { GameLibraryClient } from "@/components/games/game-library-client";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{
    genre?: string;
    developer?: string;
    publisher?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const games = await getGamesData(session.id);

  return (
    <AppShell session={session}>
      <GameLibraryClient
        games={games}
        defaultSort="recent"
        csrfToken={session.csrfToken}
        tagFilter={
          params.genre
            ? { type: "genre", value: params.genre }
            : params.developer
              ? { type: "developer", value: params.developer }
              : params.publisher
                ? { type: "publisher", value: params.publisher }
                : undefined
        }
      />
    </AppShell>
  );
}
