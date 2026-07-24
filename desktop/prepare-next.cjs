const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const stagingRoot = path.join(root, ".desktop-build");
const staged = path.join(stagingRoot, `next-${Date.now()}`);
const stableStaged = path.join(stagingRoot, "next");
const currentMarker = path.join(stagingRoot, "current-next.txt");
const nextPackage = require(
  path.join(root, "node_modules", "next", "package.json"),
);
const forcedPackages = [
  "@next/env",
  "@swc/helpers",
  "baseline-browser-mapping",
  "caniuse-lite",
  "postcss",
  "styled-jsx",
];

function copy(from, to, options = {}) {
  console.log(
    `copy ${path.relative(root, from)} -> ${path.relative(root, to)}`,
  );
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true, ...options });
}

function copyMaterialized(from, to, seen = new Set()) {
  const stat = fs.lstatSync(from);

  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(from);
    const realPath = path.resolve(path.dirname(from), target);
    if (seen.has(realPath)) {
      fs.mkdirSync(to, { recursive: true });
      return;
    }
    copyMaterialized(realPath, to, new Set([...seen, realPath]));
    return;
  }

  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
      copyMaterialized(path.join(from, entry), path.join(to, entry), seen);
    }
    return;
  }

  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function encodePnpmPackageName(packageName) {
  return packageName.replace("/", "+");
}

function cleanVersion(version) {
  return version?.replace(/^[~^]/, "");
}

function packageRoot(packageName) {
  try {
    return path.dirname(
      require.resolve(`${packageName}/package.json`, { paths: [root] }),
    );
  } catch {}

  const wantedVersion = cleanVersion(nextPackage.dependencies?.[packageName]);
  const encodedName = encodePnpmPackageName(packageName);
  const pnpmStore = path.join(root, "node_modules", ".pnpm");
  const candidates = fs
    .readdirSync(pnpmStore)
    .filter((name) => name.startsWith(`${encodedName}@`))
    .sort((a, b) => b.localeCompare(a));

  for (const candidate of candidates) {
    const candidateRoot = path.join(
      pnpmStore,
      candidate,
      "node_modules",
      ...packageName.split("/"),
    );
    const packageJson = path.join(candidateRoot, "package.json");
    if (!fs.existsSync(packageJson)) continue;
    const candidatePackage = JSON.parse(fs.readFileSync(packageJson, "utf8"));
    if (!wantedVersion || candidatePackage.version === wantedVersion) {
      return candidateRoot;
    }
  }

  throw new Error(`Unable to find package ${packageName}`);
}

function stagedPackagePath(packageName) {
  return path.join(staged, "node_modules", ...packageName.split("/"));
}

function findPrismaGeneratedClient() {
  const pnpmStore = path.join(staged, "node_modules", ".pnpm");
  const candidates = fs
    .readdirSync(pnpmStore)
    .filter((name) => name.startsWith("@prisma+client@"))
    .map((name) =>
      path.join(pnpmStore, name, "node_modules", ".prisma", "client"),
    );
  const found = candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "default.js")),
  );
  if (!found) throw new Error("Unable to find generated Prisma client");
  return found;
}

function copyPrismaGeneratedClient() {
  const generatedClient = findPrismaGeneratedClient();
  const nextNodeModules = path.join(staged, ".next", "node_modules", "@prisma");
  if (!fs.existsSync(nextNodeModules)) return;
  for (const entry of fs.readdirSync(nextNodeModules)) {
    if (!entry.startsWith("client-")) continue;
    copyMaterialized(
      generatedClient,
      path.join(nextNodeModules, entry, ".prisma", "client"),
    );
  }
}

try {
  console.log(
    `copy ${path.relative(root, standalone)} -> ${path.relative(root, staged)}`,
  );
  fs.mkdirSync(stagingRoot, { recursive: true });
  copyMaterialized(standalone, staged);
  for (const packageName of forcedPackages) {
    try {
      copyMaterialized(
        packageRoot(packageName),
        stagedPackagePath(packageName),
      );
    } catch (error) {
      console.warn(
        `skip ${packageName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  copy(
    path.join(root, ".next", "static"),
    path.join(staged, ".next", "static"),
  );
  copy(path.join(root, "public"), path.join(staged, "public"));
  copyPrismaGeneratedClient();
  fs.writeFileSync(currentMarker, staged);
  try {
    fs.rmSync(stableStaged, { recursive: true, force: true });
    fs.cpSync(staged, stableStaged, { recursive: true });
  } catch (error) {
    console.warn(
      `skip ${path.relative(root, stableStaged)} refresh: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
