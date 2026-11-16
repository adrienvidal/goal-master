-- CreateTable
CREATE TABLE "PushSubscription" (
    "endpoint" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("endpoint")
);

-- CreateIndex
CREATE INDEX "PushSubscription_playerId_idx" ON "PushSubscription"("playerId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
