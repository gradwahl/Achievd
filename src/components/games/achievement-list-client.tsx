"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Eye, EyeOff, Pin, PinOff, Search } from "lucide-react";
import { productConfig } from "@/config/product";
import {
  filterAchievements,
  type AchievementFilter,
  type AchievementSort,
} from "@/lib/services/filters";
import type { AchievementView, RarityCategory } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";
import { rarityLabel } from "@/lib/calculations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type ApiResponse =
  { ok: true; item?: { id: string } } | { ok: false; message: string };

export function AchievementListClient({
  achievements,
  csrfToken,
  defaultShowHidden,
}: {
  achievements: AchievementView[];
  csrfToken: string;
  defaultShowHidden: boolean;
}) {
  const [items, setItems] = useState(achievements);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AchievementFilter>("all");
  const [rarity, setRarity] = useState<RarityCategory | "all">("all");
  const [sort, setSort] = useState<AchievementSort>("rarity");
  const [showHidden, setShowHidden] = useState(defaultShowHidden);
  const [revealedHidden, setRevealedHidden] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleItems = useMemo(
    () => filterAchievements(items, { search, filter, rarity, sort }),
    [items, search, filter, rarity, sort],
  );

  async function togglePin(achievement: AchievementView) {
    const response = achievement.pinnedId
      ? await fetch(`/api/planner/${achievement.pinnedId}`, {
          method: "DELETE",
          headers: { [productConfig.csrfHeader]: csrfToken },
        })
      : await fetch("/api/planner", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            [productConfig.csrfHeader]: csrfToken,
          },
          body: JSON.stringify({ achievementId: achievement.id }),
        });
    const body = (await response.json()) as ApiResponse;
    if (!body.ok) {
      setToast(body.message);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === achievement.id
          ? {
              ...item,
              pinnedId: achievement.pinnedId ? undefined : body.item?.id,
            }
          : item,
      ),
    );
    setToast(
      achievement.pinnedId ? "Removed from planner." : "Pinned to planner.",
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search achievements</span>
          <Search
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search achievements"
            className="pl-9"
          />
        </label>
        <Select
          aria-label="Filter unlock state"
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as AchievementFilter)
          }
        >
          <option value="all">All states</option>
          <option value="locked">Locked</option>
          <option value="unlocked">Unlocked</option>
        </Select>
        <Select
          aria-label="Filter rarity"
          value={rarity}
          onChange={(event) =>
            setRarity(event.target.value as RarityCategory | "all")
          }
        >
          <option value="all">All rarities</option>
          <option value="common">Common</option>
          <option value="uncommon">Uncommon</option>
          <option value="rare">Rare</option>
          <option value="ultra-rare">Ultra-rare</option>
        </Select>
        <Select
          aria-label="Sort achievements"
          value={sort}
          onChange={(event) => setSort(event.target.value as AchievementSort)}
        >
          <option value="rarity">Rarity</option>
          <option value="alpha">Alphabetical</option>
          <option value="unlocked">Unlocked date</option>
          <option value="locked-first">Locked first</option>
        </Select>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowHidden((value) => !value)}
        >
          {showHidden ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          {showHidden ? "Hide spoilers" : "Show spoilers"}
        </Button>
      </div>

      {toast ? (
        <div
          role="status"
          className="rounded-md border border-cyan-300/40 bg-cyan-300/10 p-3 text-sm text-cyan-100"
        >
          {toast}
        </div>
      ) : null}

      {visibleItems.length ? (
        <div className="grid gap-3" data-testid="achievement-results">
          {visibleItems.map((achievement) => {
            const concealed =
              achievement.hidden &&
              !achievement.unlocked &&
              !showHidden &&
              !revealedHidden.has(achievement.id);
            if (concealed) {
              return (
                <Card
                  key={achievement.id}
                  className="[content-visibility:auto] [contain-intrinsic-size:96px_120px]"
                >
                  <button
                    type="button"
                    className="grid w-full gap-4 p-4 text-left sm:grid-cols-[72px_1fr] sm:items-center"
                    onClick={() =>
                      setRevealedHidden((current) =>
                        new Set(current).add(achievement.id),
                      )
                    }
                  >
                    <span className="grid h-16 w-16 place-items-center rounded-md border border-slate-700 bg-slate-900 text-slate-400">
                      <Eye className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-white">
                        Hidden achievement
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-slate-400">
                        Click to reveal hidden achievement.
                      </span>
                    </span>
                  </button>
                </Card>
              );
            }
            return (
              <Card
                key={achievement.id}
                className="[content-visibility:auto] [contain-intrinsic-size:96px_120px]"
              >
                <CardContent className="grid gap-4 p-4 sm:grid-cols-[72px_1fr_auto] sm:items-center">
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
                    width={64}
                    height={64}
                    className={cn(
                      "h-16 w-16 rounded-md object-cover",
                      !achievement.unlocked && "grayscale",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-white">
                        {achievement.displayName}
                      </h2>
                      <Badge
                        className={cn(
                          achievement.rarity === "ultra-rare" &&
                            "border-rose-300/60 text-rose-200",
                          achievement.rarity === "rare" &&
                            "border-amber-300/60 text-amber-200",
                          achievement.rarity === "uncommon" &&
                            "border-lime-300/60 text-lime-200",
                        )}
                      >
                        {rarityLabel(achievement.rarity)}
                      </Badge>
                      <Badge>
                        {achievement.unlocked ? "Unlocked" : "Locked"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {achievement.description ??
                        "No description provided by Steam."}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {achievement.globalCompletionPercentage ?? "Unknown"}%
                      global
                      {achievement.unlockedAt
                        ? ` - Unlocked ${formatDate(achievement.unlockedAt)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={achievement.pinnedId ? "secondary" : "default"}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => togglePin(achievement))
                    }
                  >
                    {achievement.pinnedId ? (
                      <PinOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Pin className="h-4 w-4" aria-hidden="true" />
                    )}
                    {achievement.pinnedId ? "Unpin" : "Pin"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No achievements match">
          Adjust search, rarity, or locked/unlocked filters.
        </EmptyState>
      )}
    </div>
  );
}
