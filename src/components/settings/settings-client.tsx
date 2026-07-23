"use client";

import { useState, useTransition } from "react";
import { Download, Save, Trash2 } from "lucide-react";
import { productConfig } from "@/config/product";
import { themePreferences } from "@/lib/types";
import type {
  GameSort,
  ThemePreference,
  UserPreferences,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { applyThemePreference } from "@/components/layout/theme-applier";

type ApiResponse =
  { ok: true; preferences?: UserPreferences } | { ok: false; message: string };

const themeLabels: Record<ThemePreference, string> = {
  dark: "Dark",
  light: "Light",
  system: "System",
  "neon-blue": "Neon blue",
  "neon-red": "Neon red",
  "neon-green": "Neon green",
  "neon-yellow": "Neon yellow",
  "neon-silver": "Neon silver",
  "neon-gold": "Neon gold",
  "neon-platinum": "Neon platinum",
  "neon-bronze": "Neon bronze",
  "neon-pink": "Neon pink",
  "neon-purple": "Neon purple",
  "neon-indigo": "Neon indigo",
  "neon-cyan": "Neon cyan",
  "neon-teal": "Neon teal",
};

export function SettingsClient({
  initialPreferences,
  initialDisplayProfileAtLogin,
  initialAutoLogin,
  csrfToken,
}: {
  initialPreferences: UserPreferences;
  initialDisplayProfileAtLogin: boolean;
  initialAutoLogin: boolean;
  csrfToken: string;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [displayProfileAtLogin, setDisplayProfileAtLogin] = useState(
    initialDisplayProfileAtLogin,
  );
  const [autoLogin, setAutoLogin] = useState(initialAutoLogin);
  const [confirmation, setConfirmation] = useState("");
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();

  async function save(next = preferences, message = "Settings saved.") {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        [productConfig.csrfHeader]: csrfToken,
      },
      body: JSON.stringify(next),
    });
    const body = (await response.json()) as ApiResponse;
    if (body.ok && body.preferences) {
      setPreferences(body.preferences);
      applyThemePreference(body.preferences.theme);
      setToast(message);
      return;
    }
    setToast(body.ok ? "Settings could not be saved." : body.message);
  }

  async function deleteAccount() {
    const response = await fetch("/api/settings", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        [productConfig.csrfHeader]: csrfToken,
      },
      body: JSON.stringify({ confirmation }),
    });
    const body = (await response.json()) as ApiResponse;
    if (!body.ok) {
      setToast(body.message);
      return;
    }
    window.location.href = "/auth/signout";
  }

  async function saveLoginOptions(next: {
    displayAtLogin?: boolean;
    autoLogin?: boolean;
  }) {
    const displayAtLogin = next.displayAtLogin ?? displayProfileAtLogin;
    const savedAutoLogin =
      displayAtLogin && (next.autoLogin ?? autoLogin);
    setDisplayProfileAtLogin(displayAtLogin);
    setAutoLogin(savedAutoLogin);
    const response = await fetch("/api/local-account", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        [productConfig.csrfHeader]: csrfToken,
      },
      body: JSON.stringify({
        displayAtLogin,
        autoLogin: savedAutoLogin,
      }),
    });
    const body = (await response.json()) as
      | { ok: true; displayAtLogin?: boolean; autoLogin?: boolean }
      | { ok: false; message: string };
    setToast(body.ok ? "Login display saved." : body.message);
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div
          role="status"
          className="rounded-md border border-cyan-300/40 bg-cyan-300/10 p-3 text-sm text-cyan-100"
        >
          {toast}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900 p-3 md:col-span-2">
            <input
              type="checkbox"
              checked={displayProfileAtLogin}
              onChange={(event) =>
                startTransition(() =>
                  saveLoginOptions({ displayAtLogin: event.target.checked }),
                )
              }
              className="h-4 w-4 accent-cyan-300"
            />
            <span>
              <span className="block text-sm font-medium text-slate-200">
                Display profile at login
              </span>
              <span className="block text-xs text-slate-400">
                Show this account as a profile tile so login only needs your
                password.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900 p-3 md:col-span-2">
            <input
              type="checkbox"
              checked={autoLogin}
              disabled={!displayProfileAtLogin}
              onChange={(event) =>
                startTransition(() =>
                  saveLoginOptions({ autoLogin: event.target.checked }),
                )
              }
              className="h-4 w-4 accent-cyan-300 disabled:opacity-50"
            />
            <span>
              <span className="block text-sm font-medium text-slate-200">
                Automatically save password
              </span>
              <span className="block text-xs text-slate-400">
                Open this account from the login tile without entering your
                password on this device.
              </span>
            </span>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">
              Hidden achievements
            </span>
            <Select
              value={preferences.spoilerMode}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  spoilerMode: event.target
                    .value as UserPreferences["spoilerMode"],
                })
              }
            >
              <option value="hide">Hide spoilers by default</option>
              <option value="show">Show spoilers by default</option>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">
              Default sort
            </span>
            <Select
              value={preferences.defaultSort}
              onChange={(event) =>
                setPreferences({
                  ...preferences,
                  defaultSort: event.target.value as GameSort,
                })
              }
            >
              <option value="completion">Completion</option>
              <option value="remaining">Achievements remaining</option>
              <option value="recent">Recently played</option>
              <option value="playtime">Playtime</option>
              <option value="name">Name</option>
            </Select>
          </label>
          <div className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Theme</span>
            <Select
              value={preferences.theme}
              onChange={(event) => {
                const theme = event.target.value as ThemePreference;
                setPreferences({
                  ...preferences,
                  theme,
                });
                applyThemePreference(theme);
              }}
            >
              {themePreferences.map((theme) => (
                <option key={theme} value={theme}>
                  {themeLabels[theme]}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(() => save(preferences, "Theme saved."))
              }
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Theme
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rarity Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {(["common", "uncommon", "rare"] as const).map((key) => (
            <label key={key} className="grid gap-2">
              <span className="text-sm font-medium capitalize text-slate-300">
                {key}
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                value={preferences.rarityThresholds[key]}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    rarityThresholds: {
                      ...preferences.rarityThresholds,
                      [key]: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
          <div className="md:col-span-3">
            <Button
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => save())}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 p-4">
            <h2 className="font-semibold text-white">Export account data</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Download profile, game, planner, and settings data as JSON.
            </p>
            <a
              href="/api/settings"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download export
            </a>
          </div>
          <div className="rounded-lg border border-red-400/40 bg-red-400/10 p-4">
            <h2 className="font-semibold text-white">Delete account data</h2>
            <p className="mt-2 text-sm leading-6 text-red-100/80">
              Type DELETE to remove the account, session, planner, and synced
              data from this application.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DELETE"
                aria-label="Deletion confirmation"
              />
              <Button
                type="button"
                variant="danger"
                disabled={confirmation !== "DELETE" || isPending}
                onClick={() => startTransition(deleteAccount)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
