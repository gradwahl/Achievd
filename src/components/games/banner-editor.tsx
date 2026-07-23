"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { productConfig } from "@/config/product";
import type { GameSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BannerEditor({
  game,
  csrfToken,
}: {
  game: GameSummary;
  csrfToken: string;
}) {
  const [open, setOpen] = useState(false);
  const initialUrl =
    game.headerImageUrl ?? game.capsuleImageUrl ?? "/ac-placeholder.svg";
  const [bannerUrl, setBannerUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [steamGridArt, setSteamGridArt] = useState<
    { id: number; url: string; thumb?: string }[]
  >([]);
  const [steamGridLoading, setSteamGridLoading] = useState(false);

  async function save(imageUrl: string | null) {
    const response = await fetch(`/api/games/${game.appId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        [productConfig.csrfHeader]: csrfToken,
      },
      body: JSON.stringify({ bannerUrl: imageUrl }),
    });
    if (!response.ok) return;
    const body = (await response.json()) as {
      ok: boolean;
      game?: GameSummary | null;
    };
    if (!body.ok || !body.game) return;
    const nextUrl =
      body.game.headerImageUrl ??
      body.game.capsuleImageUrl ??
      "/ac-placeholder.svg";
    setCurrentUrl(nextUrl);
    setBannerUrl(nextUrl);
    setOpen(false);
  }

  function upload(file?: File) {
    if (!file || !["image/jpeg", "image/png"].includes(file.type)) return;
    if (file.size > 5_000_000) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setBannerUrl(reader.result);
    });
    reader.readAsDataURL(file);
  }

  async function loadSteamGridArt() {
    if (steamGridArt.length || steamGridLoading) return;
    setSteamGridLoading(true);
    try {
      const response = await fetch(
        `/api/steamgriddb?appId=${game.appId}&type=banner`,
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
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentUrl}
        alt=""
        className="max-h-[620px] w-full object-contain"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="absolute right-3 top-3 z-10 bg-slate-950/90"
        onClick={() => setOpen(true)}
      >
        <ImageIcon className="h-4 w-4" aria-hidden="true" />
        Edit Banner
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <form
            className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-4 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              void save(bannerUrl.trim() || null);
            }}
          >
            <h2 className="font-semibold text-white">Edit Banner</h2>
            <p className="mt-1 truncate text-sm text-slate-400">{game.name}</p>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-300">
                Image URL
              </span>
              <Input
                value={bannerUrl}
                onChange={(event) => setBannerUrl(event.target.value)}
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
                onChange={(event) => upload(event.target.files?.[0])}
                className="mt-2"
              />
            </label>
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerUrl}
                alt=""
                className="mt-3 aspect-[92/35] w-full rounded-md border border-slate-800 object-cover"
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
              <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
                {steamGridArt.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    className="overflow-hidden rounded-md border border-slate-800 hover:border-cyan-300"
                    onClick={() => setBannerUrl(art.url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={art.thumb ?? art.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-[92/35] w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void save(null)}
              >
                Reset
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
