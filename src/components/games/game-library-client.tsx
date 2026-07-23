"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ImageIcon,
  MoreVertical,
  Play,
  Search,
  EyeOff,
  Star,
  Download,
} from "lucide-react";
import { productConfig } from "@/config/product";
import type { GameFilter } from "@/lib/services/filters";
import { filterGames } from "@/lib/services/filters";
import type { GameSort, GameSummary } from "@/lib/types";
import { formatPlaytime, formatRelativeDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";

export function GameLibraryClient({
  games,
  defaultSort,
  csrfToken,
}: {
  games: GameSummary[];
  defaultSort: GameSort;
  csrfToken: string;
}) {
  const [libraryGames, setLibraryGames] = useState(games);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GameFilter>("all");
  const [sort, setSort] = useState<GameSort>(defaultSort);
  const [openMenuAppId, setOpenMenuAppId] = useState<number | null>(null);
  const [boxArtGame, setBoxArtGame] = useState<GameSummary | null>(null);
  const [boxArtUrl, setBoxArtUrl] = useState("");
  const [steamGridArt, setSteamGridArt] = useState<
    { id: number; url: string; thumb?: string }[]
  >([]);
  const [steamGridLoading, setSteamGridLoading] = useState(false);
  const [installedGames, setInstalledGames] = useState<Record<number, boolean>>(
    {},
  );
  const filteredGames = useMemo(
    () => filterGames(libraryGames, { search, filter, sort }),
    [libraryGames, search, filter, sort],
  );

  useEffect(() => {
    function closeMenu(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-game-menu]")
      ) {
        return;
      }
      setOpenMenuAppId(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuAppId(null);
    }

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const appIds = libraryGames.map((game) => game.appId).join(",");
    if (!appIds) return;

    let cancelled = false;
    void fetch(`/api/steam/install-status?appIds=${appIds}`)
      .then((response) => response.json())
      .then((body: { ok: boolean; installed?: Record<number, boolean> }) => {
        if (!cancelled && body.ok) setInstalledGames(body.installed ?? {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [libraryGames]);

  async function patchGame(
    game: GameSummary,
    body: { hidden?: boolean; boxArtUrl?: string | null },
  ) {
    const response = await fetch(`/api/games/${game.appId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        [productConfig.csrfHeader]: csrfToken,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Game update failed.");
    return (await response.json()) as { ok: true; game?: GameSummary | null };
  }

  async function hideGame(game: GameSummary) {
    setOpenMenuAppId(null);
    if (!window.confirm(`Hide ${game.name}?`)) return;
    await patchGame(game, { hidden: true });
    setLibraryGames((current) =>
      current.filter((item) => item.appId !== game.appId),
    );
  }

  async function saveBoxArt(imageUrl: string | null) {
    if (!boxArtGame) return;
    const result = await patchGame(boxArtGame, { boxArtUrl: imageUrl });
    if (result.game) {
      setLibraryGames((current) =>
        current.map((item) =>
          item.appId === boxArtGame.appId ? result.game! : item,
        ),
      );
    }
    setBoxArtGame(null);
    setBoxArtUrl("");
  }

  function uploadBoxArt(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return;
    }
    if (file.size > 5_000_000) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setBoxArtUrl(reader.result);
    });
    reader.readAsDataURL(file);
  }

  function editBoxArt(game: GameSummary) {
    setOpenMenuAppId(null);
    setBoxArtGame(game);
    setBoxArtUrl(game.capsuleImageUrl ?? "");
    setSteamGridArt([]);
  }

  async function loadSteamGridArt() {
    if (!boxArtGame) return;
    if (steamGridArt.length || steamGridLoading) return;
    setSteamGridLoading(true);
    try {
      const response = await fetch(
        `/api/steamgriddb?appId=${boxArtGame.appId}&type=boxart`,
      );
      const body = (await response.json()) as {
        ok: boolean;
        art?: { id: number; url: string; thumb?: string }[];
      };
      if (body.ok) setSteamGridArt(body.art ?? []);
    } finally {
      setSteamGridLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4 md:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <span className="sr-only">Search games</span>
          <Search
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by game name"
            className="pl-9"
          />
        </label>
        <Select
          aria-label="Filter games"
          value={filter}
          onChange={(event) => setFilter(event.target.value as GameFilter)}
        >
          <option value="all">All games</option>
          <option value="perfected">Perfected</option>
          <option value="incomplete">Incomplete</option>
        </Select>
        <Select
          aria-label="Sort games"
          value={sort}
          onChange={(event) => setSort(event.target.value as GameSort)}
        >
          <option value="completion">Completion</option>
          <option value="remaining">Achievements remaining</option>
          <option value="recent">Recently played</option>
          <option value="playtime">Playtime</option>
          <option value="name">Name</option>
        </Select>
      </div>

      {filteredGames.length ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          data-testid="game-results"
        >
          {filteredGames.map((game) => (
            <GameResult
              key={game.id}
              game={game}
              menuOpen={openMenuAppId === game.appId}
              onToggleMenu={() =>
                setOpenMenuAppId((current) =>
                  current === game.appId ? null : game.appId,
                )
              }
              onHide={hideGame}
              onEditBoxArt={editBoxArt}
              installed={installedGames[game.appId]}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No games match">
          Adjust search or filters to widen the library.
        </EmptyState>
      )}

      {boxArtGame ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <form
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-4 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void saveBoxArt(boxArtUrl.trim() || null);
            }}
          >
            <h2 className="font-semibold text-white">Edit Boxart</h2>
            <p className="mt-1 truncate text-sm text-slate-400">
              {boxArtGame.name}
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-300">
                Image URL
              </span>
              <Input
                value={boxArtUrl}
                onChange={(event) => setBoxArtUrl(event.target.value)}
                placeholder="https://..."
                className="mt-2"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-sm font-medium text-slate-300">
                Upload JPEG/PNG
              </span>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) => uploadBoxArt(event.target.files?.[0])}
                className="mt-2"
              />
            </label>
            {boxArtUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={boxArtUrl}
                alt=""
                className="mt-3 h-40 w-full rounded-md border border-slate-800 object-contain"
              />
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              disabled={steamGridLoading}
              onClick={() => void loadSteamGridArt()}
            >
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              {steamGridLoading ? "Loading..." : "Browse SteamGridDB"}
            </Button>
            {steamGridArt.length ? (
              <div className="mt-3 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
                {steamGridArt.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    className="overflow-hidden rounded-md border border-slate-800 hover:border-cyan-300"
                    onClick={() => setBoxArtUrl(art.url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={art.thumb ?? art.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-[2/3] w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void saveBoxArt(null)}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setBoxArtGame(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function GameResult({
  game,
  menuOpen,
  onToggleMenu,
  onHide,
  onEditBoxArt,
  installed,
}: {
  game: GameSummary;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onHide: (game: GameSummary) => void;
  onEditBoxArt: (game: GameSummary) => void;
  installed?: boolean;
}) {
  const remaining = Math.max(
    0,
    game.totalAchievementCount - game.unlockedAchievementCount,
  );
  const imageSrc =
    game.capsuleImageUrl ?? game.headerImageUrl ?? "/ac-placeholder.svg";
  const fallbackImageSrc =
    imageSrc === game.headerImageUrl
      ? "/ac-placeholder.svg"
      : (game.headerImageUrl ?? "/ac-placeholder.svg");

  return (
    <Card className="relative h-full select-none overflow-visible [content-visibility:auto] [contain-intrinsic-size:320px_520px] transition hover:border-cyan-300/60">
      <CardContent
        className={cn(
          "relative p-0",
        )}
      >
        <Link href={`/games/${game.appId}`} aria-label={`Open ${game.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            width={600}
            height={900}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              if (event.currentTarget.src.endsWith(fallbackImageSrc)) return;
              event.currentTarget.src = fallbackImageSrc;
            }}
            className={cn(
              "aspect-[2/3] w-full object-cover",
            )}
          />
        </Link>
        <div className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                href={`/games/${game.appId}`}
                className="block truncate text-xs font-semibold text-white hover:text-cyan-100"
              >
                {game.name}
              </Link>
              <p
                className="mt-1 truncate text-[11px] text-slate-400"
              >
                {formatPlaytime(game.playtimeMinutes)} - Last played{" "}
                {formatRelativeDate(game.lastPlayedAt)}
              </p>
            </div>
            {game.perfected ? (
              <Badge className="shrink-0 border-lime-300/50 px-2 text-[10px] text-lime-200">
                Perfected
              </Badge>
            ) : null}
            <div
              className={cn(
                "relative",
                menuOpen && "pb-24",
              )}
              data-game-menu
            >
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-md border border-slate-700 bg-slate-950 text-slate-100 hover:border-cyan-300/60"
                aria-label="Game options"
                aria-expanded={menuOpen}
                onClick={onToggleMenu}
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-md border border-slate-700 bg-slate-950 py-1 shadow-xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onHide(game);
                    }}
                  >
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    Hide game
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-200 hover:bg-slate-800"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onEditBoxArt(game);
                    }}
                  >
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit Boxart
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {game.hasAchievementData ? (
            <>
              <div
                className={cn(
                  "flex items-center justify-between text-[11px]",
                )}
              >
                <span className="text-slate-400">
                  {game.unlockedAchievementCount}/{game.totalAchievementCount}{" "}
                  unlocked
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold text-cyan-300",
                    game.perfected && "text-amber-300",
                  )}
                >
                  {game.perfected ? (
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  ) : null}
                  {game.completionPercentage}%
                </span>
              </div>
              <Progress
                value={game.completionPercentage}
                indicatorClassName={game.perfected ? "bg-amber-300" : undefined}
              />
              <p
                className="text-[11px] text-slate-400"
              >
                {remaining} achievement{remaining === 1 ? "" : "s"} remaining
              </p>
            </>
          ) : (
            <div
              className={cn(
                "rounded-md border border-slate-800 bg-slate-900 p-2 text-[11px] text-slate-400",
              )}
            >
              No achievement data.
            </div>
          )}
          <div className="flex justify-center">
            <a
            href={
              installed
                ? `steam://run/${game.appId}`
                : `steam://install/${game.appId}`
            }
            className={cn(
              "inline-flex h-8 min-w-28 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold",
              installed
                ? "bg-emerald-500 text-white hover:bg-emerald-400"
                : "bg-red-500 text-white hover:bg-red-400",
            )}
          >
            {installed ? (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {installed ? "Play" : "Install"}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
