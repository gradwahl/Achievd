CREATE INDEX "UserGame_userId_hidden_completionPercentage_idx" ON "UserGame"("userId", "hidden", "completionPercentage");
CREATE INDEX "UserGame_userId_hidden_updatedAt_idx" ON "UserGame"("userId", "hidden", "updatedAt");
