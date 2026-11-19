-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "WidgetKey" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "WidgetKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetKey_hash_key" ON "WidgetKey"("hash");

-- CreateIndex
CREATE INDEX "WidgetKey_playerId_idx" ON "WidgetKey"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_playerId_externalRef_key" ON "Application"("playerId", "externalRef");

-- AddForeignKey
ALTER TABLE "WidgetKey" ADD CONSTRAINT "WidgetKey_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

