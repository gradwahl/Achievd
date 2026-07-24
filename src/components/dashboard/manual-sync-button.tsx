"use client";

import { useEffect, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { productConfig } from "@/config/product";
import type { SyncStatusView } from "@/lib/types";
import { Button } from "@/components/ui/button";

type ApiResponse =
  { ok: true; status: SyncStatusView } | { ok: false; message: string };

export function ManualSyncButton({
  csrfToken,
  initialStatus,
}: {
  csrfToken: string;
  initialStatus: SyncStatusView;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!status.running) return;
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/sync");
      const body = (await response.json()) as ApiResponse;
      if (body.ok) setStatus(body.status);
    }, 900);
    return () => window.clearInterval(timer);
  }, [status.running]);

  async function sync() {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { [productConfig.csrfHeader]: csrfToken },
    });
    const body = (await response.json()) as ApiResponse;
    if (body.ok) {
      setStatus(body.status);
      setToast(body.status.message);
      return;
    }
    setToast(body.message);
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Button
        type="button"
        disabled={isPending || status.running}
        onClick={() => startTransition(sync)}
      >
        <RefreshCw
          className={status.running ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          aria-hidden="true"
        />
        {status.running ? "Syncing" : "Steam Sync"}
      </Button>
      <p className="text-sm text-slate-400" aria-live="polite">
        {status.message}
      </p>
      {status.running ? (
        <div className="w-full max-w-md space-y-1">
          <div className="flex justify-between text-xs text-emerald-100">
            <span>Sync progress</span>
            <span className="font-mono">
              {status.currentGames}/{status.totalGames}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-[width]"
              style={{ width: `${status.progressPercentage}%` }}
            />
          </div>
        </div>
      ) : null}
      {toast ? (
        <div
          role="status"
          className="rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
