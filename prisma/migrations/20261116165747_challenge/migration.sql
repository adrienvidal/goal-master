-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "winnerId" TEXT,
    "wonAt" TIMESTAMP(3),

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_createdAt_idx" ON "Challenge"("createdAt");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
