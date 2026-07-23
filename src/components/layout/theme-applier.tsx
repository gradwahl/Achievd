"use client";

import { useEffect } from "react";
import type { ThemePreference } from "@/lib/types";

export function applyThemePreference(preference: ThemePreference) {
  const theme =
    preference === "system"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.theme = theme;
}

export function ThemeApplier({
  preference,
}: {
  preference: ThemePreference;
}) {
  useEffect(() => {
    applyThemePreference(preference);
    if (preference !== "system") return;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const syncTheme = () => applyThemePreference(preference);
    media.addEventListener("change", syncTheme);
    return () => media.removeEventListener("change", syncTheme);
  }, [preference]);

  return null;
}
