ALTER TABLE "Achievement" ADD COLUMN "achievementGroupName" TEXT;
ALTER TABLE "Achievement" ADD COLUMN "achievementGroupSort" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Achievement" ADD COLUMN "achievementGroupSteamAppId" INTEGER;
ALTER TABLE "Achievement" ADD COLUMN "achievementGroupLastSyncedAt" TIMESTAMP(3);
ALTER TABLE "Achievement" ADD COLUMN "obtainability" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Achievement" ADD COLUMN "obtainabilityLastSyncedAt" TIMESTAMP(3);

CREATE INDEX "Achievement_gameId_achievementGroupSort_idx" ON "Achievement"("gameId", "achievementGroupSort");
CREATE INDEX "Achievement_gameId_obtainability_idx" ON "Achievement"("gameId", "obtainability");
