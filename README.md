# Achievd

Standalone Steam achievement tracking, planning, and sync dashboard.

Achievd is a desktop app for seeing your Steam achievement progress, finding games closest to completion, tracking rare locked achievements, and building a small planner for what to finish next.

---

## What is Achievd?

Achievd is a live Steam achievement assistant built with Electron, Next.js, Prisma, and PostgreSQL.

It does **not** unlock, lock, or modify Steam achievements. It reads your Steam library and achievement data through the Steam Web API, stores it locally, and gives you a cleaner dashboard for planning achievement hunts.

---

## Features

- Live Steam profile, owned-games, achievement, and global-rarity sync
- Dashboard with completion, remaining achievements, perfected games, and recent unlocks
- Game library with search, filters, sorting, cards, and compact list view
- Install games from Steam directly from the library when they are not installed
- Play installed Steam games directly from the library
- Per-game achievement pages with spoiler hiding and rarity labels
- Planner for pinned achievements, notes, manual progress, priority, and archive state
- Global sync progress visible while using Dashboard, Games, Planner, or Settings
- Local desktop accounts with encrypted per-user Steam API keys
- PostgreSQL-backed storage for larger scraped datasets
- JSON export and account deletion from Settings

---

## How to Run Achievd?

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local PostgreSQL

This repo includes a portable local Postgres setup once installed through the helper flow:

```bash
pnpm postgres:start
```

Connection string used by default:

```text
postgresql://postgres:postgres@localhost:5432/achievement_compass
```

### 3. Initialize the database

```bash
pnpm db:migrate
```

### 4. Run the desktop app

```bash
pnpm desktop:dev
```

Create a local account in the app with:

- Username and password
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
dist/Achievd 0.1.0.exe
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
- More robust image fallback and local asset cache
- Full text search for games and achievements
- Scraped community guides and difficulty metadata
- Better recommendation scoring using rarity, playtime, and recent activity
- Restore flow for exported account data
- More complete end-to-end tests against a seeded Postgres database

---

## Notes

Achievd is not affiliated with Valve or Steam.

Steam privacy settings can hide owned games, playtime, and achievements. Existing synced data is preserved when Steam has temporary errors.
