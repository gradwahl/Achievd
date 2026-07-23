import Image from "next/image";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getGamesData } from "@/lib/services/app-service";
import { getRepository } from "@/lib/repositories";
import { rarityLabel } from "@/lib/calculations";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const SUGGESTION_LIMIT = 20;

export default async function SuggestionPage() {
  const session = await requireSession();
  const [games, suggestions] = await Promise.all([
    getGamesData(session.id),
    getRepository().getSuggestedAchievements(session.id, SUGGESTION_LIMIT),
  ]);
  const gameNames = new Map(games.map((game) => [game.appId, game.name]));

  return (
    <AppShell session={session}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Suggestion</h1>
          <p className="mt-2 text-sm text-slate-400">
            20 locked trophies sorted from most common to rarest.
          </p>
        </div>

        {suggestions.length ? (
          <div className="space-y-2">
            {suggestions.map((achievement) => (
              <Link
                key={achievement.id}
                href={`/games/${achievement.appId}`}
                className="block"
              >
                <Card className="[content-visibility:auto] [contain-intrinsic-size:72px_96px] hover:border-cyan-300/60">
                  <CardContent className="grid gap-3 p-3 sm:grid-cols-[56px_1fr_auto] sm:items-center">
                    <Image
                      src={
                        achievement.unlocked
                          ? (achievement.unlockedIconUrl ??
                            achievement.lockedIconUrl ??
                            "/ac-placeholder.svg")
                          : (achievement.lockedIconUrl ??
                            achievement.unlockedIconUrl ??
                            "/ac-placeholder.svg")
                      }
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {achievement.displayName}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {gameNames.get(achievement.appId) ?? "Unknown game"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge>{rarityLabel(achievement.rarity)}</Badge>
                      <span className="text-sm font-semibold text-cyan-300">
                        {achievement.globalCompletionPercentage ?? "Unknown"}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No trophies found">
            Sync your Steam data to populate suggestions.
          </EmptyState>
        )}
      </div>
    </AppShell>
  );
}
