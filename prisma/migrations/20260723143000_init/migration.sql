CREATE TYPE "VisibilityState" AS ENUM ('PUBLIC', 'PRIVATE', 'FRIENDS_ONLY', 'UNKNOWN');
CREATE TYPE "SyncType" AS ENUM ('PROFILE', 'FULL', 'GAME', 'RARITY');
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILURE');
CREATE TYPE "PinPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "PinState" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "steamId" TEXT NOT NULL,
  "preferences" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastLoginAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SteamProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "avatarSmallUrl" TEXT,
  "avatarMediumUrl" TEXT,
  "avatarFullUrl" TEXT,
  "profileUrl" TEXT,
  "visibilityState" "VisibilityState" NOT NULL DEFAULT 'UNKNOWN',
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SteamProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Game" (
  "id" TEXT NOT NULL,
  "steamAppId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "capsuleImageUrl" TEXT,
  "headerImageUrl" TEXT,
  "totalKnownAchievements" INTEGER NOT NULL DEFAULT 0,
  "lastSchemaSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserGame" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "playtimeMinutes" INTEGER,
  "unlockedAchievementCount" INTEGER NOT NULL DEFAULT 0,
  "totalAchievementCount" INTEGER NOT NULL DEFAULT 0,
  "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "perfected" BOOLEAN NOT NULL DEFAULT false,
  "lastPlayedAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserGame_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Achievement" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "apiName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "lockedIconUrl" TEXT,
  "unlockedIconUrl" TEXT,
  "globalCompletionPercentage" DOUBLE PRECISION,
  "globalCompletionLastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "unlocked" BOOLEAN NOT NULL DEFAULT false,
  "unlockedAt" TIMESTAMP(3),
  "firstObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastObservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PinnedAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "manualProgressText" TEXT NOT NULL DEFAULT '',
  "priority" "PinPriority" NOT NULL DEFAULT 'MEDIUM',
  "state" "PinState" NOT NULL DEFAULT 'ACTIVE',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PinnedAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "syncType" "SyncType" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
  "errorSummary" TEXT,
  "gamesUpdated" INTEGER NOT NULL DEFAULT 0,
  "achievementsUpdated" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SyncRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_steamId_key" ON "User"("steamId");
CREATE INDEX "User_steamId_idx" ON "User"("steamId");
CREATE UNIQUE INDEX "SteamProfile_userId_key" ON "SteamProfile"("userId");
CREATE UNIQUE INDEX "Game_steamAppId_key" ON "Game"("steamAppId");
CREATE INDEX "Game_name_idx" ON "Game"("name");
CREATE UNIQUE INDEX "UserGame_userId_gameId_key" ON "UserGame"("userId", "gameId");
CREATE INDEX "UserGame_userId_perfected_idx" ON "UserGame"("userId", "perfected");
CREATE INDEX "UserGame_userId_completionPercentage_idx" ON "UserGame"("userId", "completionPercentage");
CREATE INDEX "UserGame_userId_lastPlayedAt_idx" ON "UserGame"("userId", "lastPlayedAt");
CREATE UNIQUE INDEX "Achievement_gameId_apiName_key" ON "Achievement"("gameId", "apiName");
CREATE INDEX "Achievement_gameId_hidden_idx" ON "Achievement"("gameId", "hidden");
CREATE INDEX "Achievement_globalCompletionPercentage_idx" ON "Achievement"("globalCompletionPercentage");
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
CREATE INDEX "UserAchievement_userId_unlocked_idx" ON "UserAchievement"("userId", "unlocked");
CREATE INDEX "UserAchievement_userId_unlockedAt_idx" ON "UserAchievement"("userId", "unlockedAt");
CREATE UNIQUE INDEX "PinnedAchievement_userId_achievementId_key" ON "PinnedAchievement"("userId", "achievementId");
CREATE INDEX "PinnedAchievement_userId_state_position_idx" ON "PinnedAchievement"("userId", "state", "position");
CREATE INDEX "SyncRecord_userId_syncType_startedAt_idx" ON "SyncRecord"("userId", "syncType", "startedAt");
CREATE INDEX "SyncRecord_userId_status_idx" ON "SyncRecord"("userId", "status");

ALTER TABLE "SteamProfile" ADD CONSTRAINT "SteamProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PinnedAchievement" ADD CONSTRAINT "PinnedAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PinnedAchievement" ADD CONSTRAINT "PinnedAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncRecord" ADD CONSTRAINT "SyncRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
