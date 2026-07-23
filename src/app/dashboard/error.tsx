"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-lg border border-red-400/40 bg-red-400/10 p-6">
        <h1 className="text-xl font-semibold text-white">
          Dashboard failed to load
        </h1>
        <p className="mt-2 text-sm text-red-100">{error.message}</p>
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
