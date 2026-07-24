import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Star,
  Trophy,
} from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getGameDetailData, getSettingsData } from "@/lib/services/app-service";
import { formatPlaytime, formatRelativeDate } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";
import { AchievementListClient } from "@/components/games/achievement-list-client";
import { BannerEditor } from "@/components/games/banner-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const session = await requireSession();
  const { appId } = await params;
  const parsedAppId = Number(appId);
  if (!Number.isInteger(parsedAppId)) notFound();

  const [detail, preferences] = await Promise.all([
    getGameDetailData(session.id, parsedAppId),
    getSettingsData(session.id),
  ]);
  const remaining = Math.max(
    0,
    detail.game.totalAchievementCount - detail.game.unlockedAchievementCount,
  );
  const genres = detail.game.genres ?? [];
  const developers = detail.game.developers ?? [];
  const publishers = detail.game.publishers ?? [];

  const tagLink = (type: "genre" | "developer" | "publisher", value: string) =>
    `/games?${type}=${encodeURIComponent(value)}`;
  const tagClassName = "text-cyan-300 hover:text-cyan-100";
  const tags = (type: "genre" | "developer" | "publisher", values: string[]) =>
    values.length
      ? values.map((value, index) => (
          <span key={value}>
            {index ? ", " : null}
            <Link href={tagLink(type, value)} className={tagClassName}>
              {value}
            </Link>
          </span>
        ))
      : "Unknown";

  return (
    <AppShell session={session}>
      <div className="space-y-5">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to games
        </Link>

        <section className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          <BannerEditor game={detail.game} csrfToken={session.csrfToken} />
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-white">
                  {detail.game.name}
                </h1>
                {detail.game.perfected ? (
                  <Badge className="border-lime-300/60 text-lime-200">
                    Perfected
                  </Badge>
                ) : null}
                {detail.game.hasPaidDlc ? (
                  <Badge className="gap-1.5 border-amber-300/60 text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Paid DLC required
                  </Badge>
                ) : null}
              </div>
              <dl className="mt-3 grid gap-1.5 text-sm text-slate-300">
                <div>
                  <dt className="inline text-slate-500">Total Playtime: </dt>
                  <dd className="inline">
                    {formatPlaytime(detail.game.playtimeMinutes)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Last Played: </dt>
                  <dd className="inline">
                    {formatRelativeDate(detail.game.lastPlayedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Genre: </dt>
                  <dd className="inline">{tags("genre", genres)}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Publisher: </dt>
                  <dd className="inline">{tags("publisher", publishers)}</dd>
                </div>
                <div>
                  <dt className="inline text-slate-500">Developer: </dt>
                  <dd className="inline">{tags("developer", developers)}</dd>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <a
                    href={`https://store.steampowered.com/app/${detail.game.appId}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-100"
                  >
                    Steam Store
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <a
                    href={`https://www.pcgamingwiki.com/api/appid.php?appid=${detail.game.appId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-100"
                  >
                    PCGamingWiki
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <a
                    href={`https://isthereanydeal.com/steam/app/${detail.game.appId}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-100"
                  >
                    IsThereAnyDeal
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </dl>
            </div>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-400">Completion</span>
                  <span
                    className={`inline-flex items-center gap-1 text-xl font-bold ${
                      detail.game.perfected ? "text-amber-300" : "text-cyan-300"
                    }`}
                  >
                    {detail.game.perfected ? (
                      <Star
                        className="h-5 w-5 fill-current"
                        aria-hidden="true"
                      />
                    ) : null}
                    {detail.game.completionPercentage}%
                  </span>
                </div>
                <Progress
                  value={detail.game.completionPercentage}
                  className="mt-3"
                  indicatorClassName={
                    detail.game.perfected ? "bg-amber-300" : undefined
                  }
                />
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <span>
                    <strong className="block text-white">
                      {detail.game.unlockedAchievementCount}
                    </strong>
                    <span className="text-slate-500">Unlocked</span>
                  </span>
                  <span>
                    <strong className="block text-white">{remaining}</strong>
                    <span className="text-slate-500">Left</span>
                  </span>
                  <span>
                    <strong className="block text-white">
                      {detail.game.totalAchievementCount}
                    </strong>
                    <span className="text-slate-500">Total</span>
                  </span>
                </div>
                {detail.game.fastestCompletionTime ||
                detail.game.medianCompletionTime ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-center text-sm">
                    <span>
                      <strong className="block text-white">
                        {formatPlaytime(detail.game.fastestCompletionTime)}
                      </strong>
                      <span className="text-slate-500">Fastest</span>
                    </span>
                    <span>
                      <strong className="block text-white">
                        {formatPlaytime(detail.game.medianCompletionTime)}
                      </strong>
                      <span className="text-slate-500">Median</span>
                    </span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>

        {detail.game.hasAchievementData ? (
          <AchievementListClient
            achievements={detail.achievements}
            defaultShowHidden={preferences.spoilerMode === "show"}
            gameName={detail.game.name}
          />
        ) : (
          <EmptyState title="No achievement data">
            <Trophy
              className="mx-auto mb-2 h-6 w-6 text-slate-500"
              aria-hidden="true"
            />
            Steam does not expose achievements for this game.
          </EmptyState>
        )}
      </div>
    </AppShell>
  );
}
