"use client";

import { useEffect, useState } from "react";
import { productConfig } from "@/config/product";
import type { SyncStatusView } from "@/lib/types";

type ApiResponse =
  { ok: true; status: SyncStatusView } | { ok: false; message: string };

function titleFor(status: SyncStatusView) {
  return status.running
    ? `${productConfig.name} - Syncing ${status.progressPercentage}%`
    : productConfig.name;
}

export function SyncProgress({
  initialStatus,
}: {
  initialStatus: SyncStatusView;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    document.title = titleFor(status);
    return () => {
      document.title = productConfig.name;
    };
  }, [status]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/sync");
      const body = (await response.json()) as ApiResponse;
      if (body.ok) setStatus(body.status);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!status.running && status.status !== "failure") return null;

  return (
    <div
      role="status"
      className={
        status.running
          ? "mb-5 rounded-lg border border-cyan-300/40 bg-cyan-300/10 p-3 text-sm text-cyan-100"
          : "mb-5 rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-100"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{status.message}</span>
        {status.running ? (
          <span className="font-mono text-xs">
            {status.currentGames}/{status.totalGames}
          </span>
        ) : null}
      </div>
      {status.running ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width]"
            style={{ width: `${status.progressPercentage}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
