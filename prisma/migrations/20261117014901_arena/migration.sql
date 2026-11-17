-- CreateEnum
CREATE TYPE "ArenaStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArenaKind" AS ENUM ('ATTACK', 'PARRY', 'THRUST', 'WHIRL', 'POTION', 'END');

-- CreateTable
CREATE TABLE "Arena" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "status" "ArenaStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "challengerForm" INTEGER,
    "opponentForm" INTEGER,
    "challengerEnergy" INTEGER,
    "opponentEnergy" INTEGER,

    CONSTRAINT "Arena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaAction" (
    "id" TEXT NOT NULL,
    "arenaId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "kind" "ArenaKind" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Arena_createdAt_idx" ON "Arena"("createdAt");

-- CreateIndex
CREATE INDEX "ArenaAction_arenaId_createdAt_idx" ON "ArenaAction"("arenaId", "createdAt");

-- AddForeignKey
ALTER TABLE "Arena" ADD CONSTRAINT "Arena_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arena" ADD CONSTRAINT "Arena_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaAction" ADD CONSTRAINT "ArenaAction_arenaId_fkey" FOREIGN KEY ("arenaId") REFERENCES "Arena"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaAction" ADD CONSTRAINT "ArenaAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
