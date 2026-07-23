import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  help,
  change,
  icon,
}: {
  label: string;
  value: string;
  help: string;
  change?: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-400">{label}</p>
          <span className="text-cyan-300">{icon}</span>
        </div>
        <p className="mt-3 text-2xl font-bold text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{help}</p>
        {change ? (
          <p className="mt-2 text-xs font-medium text-emerald-300">
            {change}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
