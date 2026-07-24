"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Search } from "lucide-react";
import {
  filterAchievements,
  type AchievementFilter,
  type AchievementSort,
} from "@/lib/services/filters";
import type { AchievementView, RarityCategory } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";
import { rarityLabel } from "@/lib/calculations";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

function obtainabilityLabel(value: number) {
  if (value === 1) return "Broken but obtainable";
  if (value === 2) return "Conditional";
  if (value === 3) return "Unobtainable";
  return "";
}

function YoutubeGuideIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2L10 15.2Z" />
    </svg>
  );
}

export function AchievementListClient({
  achievements,
  defaultShowHidden,
  gameName,
}: {
  achievements: AchievementView[];
  defaultShowHidden: boolean;
  gameName: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AchievementFilter>("all");
  const [rarity, setRarity] = useState<RarityCategory | "all">("all");
  const [sort, setSort] = useState<AchievementSort>("rarity");
  const [showHidden, setShowHidden] = useState(defaultShowHidden);
  const [revealedHidden, setRevealedHidden] = useState<Set<string>>(new Set());

  const visibleItems = useMemo(
    () => filterAchievements(achievements, { search, filter, rarity, sort }),
    [achievements, search, filter, rarity, sort],
  );
  const groupedItems = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; sort: number; achievements: AchievementView[] }
    >();
    for (const achievement of visibleItems) {
      const name = achievement.achievementGroupName ?? "Base Game";
      const current = groups.get(name) ?? {
        name,
        sort: achievement.achievementGroupSort,
        achievements: [],
      };
      current.achievements.push(achievement);
      groups.set(name, current);
    }
    return Array.from(groups.values()).sort(
      (a, b) => a.sort - b.sort || a.name.localeCompare(b.name),
    );
  }, [visibleItems]);

  function guideUrl(site: "google" | "youtube", achievement: AchievementView) {
    const query = encodeURIComponent(
      `${gameName} ${achievement.displayName} achievement guide`,
    );
    return site === "google"
      ? `https://www.google.com/search?q=${query}`
      : `https://www.youtube.com/results?search_query=${query}`;
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
          <option value="unobtainable">Unobtainable</option>
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

      {visibleItems.length ? (
        <div className="grid gap-3" data-testid="achievement-results">
          {groupedItems.map((group) => (
            <section key={group.name} className="grid gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  {group.name}
                </h2>
                <span className="text-xs text-slate-500">
                  {group.achievements.length} achievement
                  {group.achievements.length === 1 ? "" : "s"}
                </span>
              </div>
              {group.achievements.map((achievement) => {
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
                const obtainability = obtainabilityLabel(
                  achievement.obtainability,
                );
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
                          {obtainability ? (
                            <Badge
                              className={cn(
                                achievement.obtainability === 3 &&
                                  "border-red-300/60 text-red-200",
                                achievement.obtainability === 2 &&
                                  "border-amber-300/60 text-amber-200",
                              )}
                            >
                              {obtainability}
                            </Badge>
                          ) : null}
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
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <a
                          href={guideUrl("google", achievement)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Search Google for ${achievement.displayName} guide`}
                          className={buttonClassName({
                            variant: "secondary",
                            size: "icon",
                          })}
                        >
                          <span aria-hidden="true">G</span>
                        </a>
                        <a
                          href={guideUrl("youtube", achievement)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Search YouTube for ${achievement.displayName} guide`}
                          className={buttonClassName({
                            variant: "secondary",
                            size: "icon",
                          })}
                        >
                          <YoutubeGuideIcon />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="No achievements match">
          Adjust search, rarity, or locked/unlocked filters.
        </EmptyState>
      )}
    </div>
  );
}
