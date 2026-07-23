import Link from "next/link";
import Image from "next/image";
import { Award, CheckCircle2, Clock, Gamepad2, Trophy } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatRelativeDate } from "@/lib/utils";
import {
  getDashboardData,
  getRecommendationsData,
} from "@/lib/services/app-service";
import { startUserSync } from "@/lib/jobs/sync-jobs";
import { getRepository } from "@/lib/repositories";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ManualSyncButton } from "@/components/dashboard/manual-sync-button";
import { PrivateProfileNotice } from "@/components/dashboard/private-profile-notice";
import { RecommendationList } from "@/components/dashboard/recommendation-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sync?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  if (params.sync === "1") {
    await startUserSync(session);
  }
  const repository = getRepository();
  const [dashboard, recommendations, syncStatus] = await Promise.all([
    getDashboardData(session.id),
    getRecommendationsData(session.id),
    repository.getSyncStatus(session.id),
  ]);
  const monthChange = dashboard.monthChange;
  const signed = (value: number, suffix = "") =>
    `${value > 0 ? "+" : ""}${value}${suffix} since last month`;

  return (
    <AppShell session={session}>
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="flex items-center gap-4">
            {dashboard.profile.avatarFullUrl ? (
              <Image
                src={dashboard.profile.avatarFullUrl}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-lg bg-slate-800">
                <Gamepad2
                  className="h-7 w-7 text-slate-300"
                  aria-hidden="true"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">
                {dashboard.profile.displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Last successful sync:{" "}
                {dashboard.lastSuccessfulSyncAt
                  ? formatRelativeDate(dashboard.lastSuccessfulSyncAt)
                  : "Never"}
              </p>
            </div>
          </div>
          <ManualSyncButton
            csrfToken={session.csrfToken}
            initialStatus={syncStatus}
          />
        </section>

        {dashboard.privateProfile ? <PrivateProfileNotice /> : null}
        {dashboard.stale && !dashboard.privateProfile ? (
          <div className="rounded-lg border border-amber-300/40 bg-amber-300/10 p-4 text-sm text-amber-50">
            Displayed data may be stale. Run a manual sync when Steam is
            available.
          </div>
        ) : null}

        {!dashboard.privateProfile ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Completion"
                value={`${dashboard.overallCompletionPercentage}%`}
                help={`${dashboard.totalUnlocked} of ${dashboard.totalAchievements} unlocked`}
                change={signed(monthChange.completionPercentage, "%")}
                icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
              />
              <StatCard
                label="Remaining"
                value={String(dashboard.remainingAchievements)}
                help="Achievements left across synced games"
                change={signed(monthChange.remaining)}
                icon={<Clock className="h-5 w-5" aria-hidden="true" />}
              />
              <StatCard
                label="Perfected"
                value={String(dashboard.perfectedGameCount)}
                help="Games at 100%"
                change={signed(monthChange.perfected)}
                icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
              />
              <StatCard
                label="With achievements"
                value={String(dashboard.gamesWithAchievements)}
                help="Games exposing achievement data"
                change={signed(monthChange.gamesWithAchievements)}
                icon={<Gamepad2 className="h-5 w-5" aria-hidden="true" />}
              />
              <StatCard
                label="Recent unlocks"
                value={String(dashboard.recentAchievements.length)}
                help="Latest observed achievements"
                change={signed(monthChange.recentUnlocks)}
                icon={<Award className="h-5 w-5" aria-hidden="true" />}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Achievement Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.activity.length ? (
                    <ActivityChart data={dashboard.activity} />
                  ) : (
                    <EmptyState title="No recent unlocks">
                      Sync your Steam data to populate the activity chart.
                    </EmptyState>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recently Unlocked</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboard.recentAchievements.map((achievement) => (
                    <Link
                      key={achievement.id}
                      href={`/games/${achievement.appId}`}
                      className="flex gap-3 rounded-md p-2 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-cyan-300"
                    >
                      <Image
                        src={
                          achievement.unlockedIconUrl ??
                          achievement.lockedIconUrl ??
                          "/ac-placeholder.svg"
                        }
                        alt=""
                        width={64}
                        height={44}
                        className="h-11 w-16 rounded object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {achievement.displayName}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {achievement.gameName} -{" "}
                          {formatDate(achievement.unlockedAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Closest To 100%</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dashboard.closestGames.map((game) => (
                    <Link
                      key={game.id}
                      href={`/games/${game.appId}`}
                      className="block rounded-md p-2 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-cyan-300"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-white">
                          {game.name}
                        </span>
                        <Badge>
                          {game.totalAchievementCount -
                            game.unlockedAchievementCount}{" "}
                          left
                        </Badge>
                      </div>
                      <Progress
                        value={game.completionPercentage}
                        className="mt-3"
                      />
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommended Next Games</CardTitle>
                </CardHeader>
                <CardContent>
                  {recommendations.length ? (
                    <RecommendationList recommendations={recommendations} />
                  ) : (
                    <EmptyState title="No recommendations yet">
                      Sync games with achievement data to see deterministic next
                      targets.
                    </EmptyState>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
