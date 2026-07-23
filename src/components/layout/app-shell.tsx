import Link from "next/link";
import { Compass, LogOut } from "lucide-react";
import { productConfig } from "@/config/product";
import { getRepository } from "@/lib/repositories";
import { getUserSyncStatus } from "@/lib/jobs/sync-jobs";
import type { SessionUser } from "@/lib/types";
import { buttonClassName } from "@/components/ui/button";
import { MainNav } from "@/components/layout/main-nav";
import { SyncProgress } from "@/components/layout/sync-progress";

export async function AppShell({
  session,
  children,
}: {
  session: SessionUser;
  children: React.ReactNode;
}) {
  const profile = await getRepository().getProfile(session.id);
  const syncStatus = await getUserSyncStatus(session.id);

  return (
    <div className="min-h-screen bg-[#080b10]">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#080b10]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              <span className="grid h-10 w-10 place-items-center rounded-md bg-cyan-300 text-slate-950">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-semibold">
                  {productConfig.name}
                </span>
                <span className="block text-xs text-slate-400">
                  {profile.displayName}
                </span>
              </span>
            </Link>
            <form action="/auth/signout" method="post" className="lg:hidden">
              <button
                className={buttonClassName({ variant: "ghost", size: "icon" })}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Sign out</span>
              </button>
            </form>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <MainNav />
            <form
              action="/auth/signout"
              method="post"
              className="hidden lg:block"
            >
              <button className={buttonClassName({ variant: "secondary" })}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SyncProgress initialStatus={syncStatus} />
        {children}
      </main>
    </div>
  );
}
