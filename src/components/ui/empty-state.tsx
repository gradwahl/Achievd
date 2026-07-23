import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/80 p-6 text-center">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-slate-400">{children}</div>
    </div>
  );
}
