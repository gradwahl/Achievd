import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import type { Recommendation } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RecommendationList({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <div className="grid gap-3">
      {recommendations.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Target className="h-4 w-4 text-lime-300" aria-hidden="true" />
                <Badge>{item.label}</Badge>
              </div>
              <h3 className="mt-2 font-semibold text-white">
                {item.game.name}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {item.explanation}
              </p>
            </div>
            <Link
              href={`/games/${item.game.appId}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-100"
            >
              Open game
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
