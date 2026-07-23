import { access, readFile } from "node:fs/promises";
import path from "node:path";

function defaultSteamDir() {
  return path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Steam");
}
const cache = new Map<number, { expiresAt: number; installed: boolean }>();

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseLibraryPaths(value: string) {
  const paths = new Set<string>([path.join(defaultSteamDir(), "steamapps")]);
  for (const match of value.matchAll(/"path"\s+"([^"]+)"/g)) {
    const libraryPath = match[1];
    if (libraryPath) {
      paths.add(path.join(libraryPath.replaceAll("\\\\", "\\"), "steamapps"));
    }
  }
  return [...paths];
}

export async function isSteamGameInstalled(appId: number) {
  const cached = cache.get(appId);
  if (cached && cached.expiresAt > Date.now()) return cached.installed;

  let libraryText = "";
  try {
    libraryText = await readFile(
      path.join(defaultSteamDir(), "steamapps", "libraryfolders.vdf"),
      "utf8",
    );
  } catch {}

  const installedChecks = await Promise.all(
    parseLibraryPaths(libraryText).map((steamApps) =>
      exists(path.join(steamApps, `appmanifest_${appId}.acf`)),
    ),
  );
  const installed = installedChecks.some(Boolean);

  cache.set(appId, { expiresAt: Date.now() + 30_000, installed });
  return installed;
}
