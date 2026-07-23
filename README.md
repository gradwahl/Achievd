# Achievd

Standalone Steam achievement tracking, planning, and sync dashboard.

Achievd is a desktop app for seeing your Steam achievement progress, finding games closest to completion, customizing your library, tracking rare locked achievements, and building a small planner for what to finish next.

---

## Screenshots

![Home](docs/screenshots/home.png)
_Home_

![Synced Games](docs/screenshots/synced-games.png)
_Synced Games_

![Suggested What to earn next (Easiest>Hardest)](docs/screenshots/suggested-next.png)
_Suggested What to earn next (Easiest>Hardest)_

![Settings](docs/screenshots/settings.png)
_Settings_

![Achievement Layout](docs/screenshots/achievement-layout.png)
_Achievement Layout_

---

## What is Achievd?

Achievd is a live Steam achievement assistant built with Electron, Next.js, Prisma, and PostgreSQL.

It does **not** unlock, lock, or modify Steam achievements. It reads your Steam library and achievement data through the Steam Web API, stores it locally, and gives you a cleaner dashboard for planning achievement hunts.

---

## Features

- Live Steam profile, owned-games, achievement, and global-rarity sync
- Dashboard with completion, remaining achievements, perfected games, and recent unlocks
- Game library with search, filters, sorting, hidden games, and box-art editing
- Install games from Steam directly from the library when they are not installed
- Play installed Steam games directly from the library
- Per-game achievement pages with spoiler hiding, rarity labels, and custom banners
- SteamGridDB browsing for replacement box art and banners when `STEAMGRIDDB_API_KEY` is configured
- Planner for pinned achievements, notes, manual progress, priority, and archive state
- Global sync progress visible while using Dashboard, Games, Planner, or Settings
- Local desktop accounts with encrypted per-user Steam API keys, login tiles, and optional saved-password login
- Settings for spoiler mode, default library sort, theme preference, and rarity thresholds
- PostgreSQL-backed storage for larger scraped datasets
- JSON export and account deletion from Settings

---

## How to Run Achievd?

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Create `.env` from `.env.example` and keep the default local database URL unless you are using your own PostgreSQL instance.

```env
APP_URL=http://localhost:3000
SESSION_SECRET=replace-with-at-least-32-random-characters
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/Achievd
STEAM_API_KEY=
STEAMGRIDDB_API_KEY=
```

`STEAM_API_KEY` and `STEAMGRIDDB_API_KEY` are optional. Achievd can also store a Steam API key per local account.

### 3. Start local PostgreSQL

This repo includes a portable local Postgres setup once installed through the helper flow:

```bash
pnpm postgres:start
```

Connection string used by default:

```text
postgresql://postgres:postgres@localhost:5432/Achievd
```

### 4. Initialize the database

```bash
pnpm db:migrate
```

### 5. Run the desktop app

```bash
pnpm desktop:dev
```

Create a local account in the app with:

- Username and password
- Password confirmation
- Steam Web API key
- Steam64ID

Steam API key page:

```text
https://steamcommunity.com/dev/apikey
```

Steam64ID lookup:

```text
https://steamid.io/
```

Optional SteamGridDB art browsing:

```env
STEAMGRIDDB_API_KEY=your_steamgriddb_key
```

---

## Build Instructions for Electron

### Development desktop shell

```bash
pnpm desktop:dev
```

### Build unpacked Windows app

```bash
pnpm desktop:build
```

Output:

```text
dist/win-unpacked/Achievd.exe
```

### Build Windows installer

```bash
pnpm desktop:package
```

Output:

```text
dist/Achievd Setup 0.1.0.exe
```

### Build portable Windows executable

```bash
pnpm desktop:portable
```

---

## Dependencies / Requirements

### Runtime

- Windows
- Node.js
- pnpm
- PostgreSQL running on `localhost:5432`
- Steam Web API key
- Steam64ID

### Main stack

- Electron
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Recharts
- Zod
- Vitest
- React Testing Library
- Playwright

### Useful scripts

```bash
pnpm dev
pnpm start
pnpm desktop:dev
pnpm desktop:build
pnpm desktop:package
pnpm desktop:portable
pnpm postgres:start
pnpm postgres:stop
pnpm db:migrate
pnpm prisma:generate
pnpm typecheck
pnpm lint
pnpm format
pnpm format:check
pnpm test
pnpm test:unit
pnpm test:e2e
pnpm build
```

---

## Upcoming Features / What Needs Implemented

- Durable sync queue instead of in-process jobs
- Better per-game sync diagnostics and skipped-game reporting
- Scheduled background sync and rarity refresh
- Import SQLite/local data into PostgreSQL
- Full text search for games and achievements
- Scraped community guides and difficulty metadata
- Better recommendation scoring using rarity, playtime, and recent activity
- Restore flow for exported account data
- More complete end-to-end tests against a seeded Postgres database

---

## Notes

Achievd is not affiliated with Valve or Steam.

Steam privacy settings can hide owned games, playtime, and achievements. Existing synced data is preserved when Steam has temporary errors.
