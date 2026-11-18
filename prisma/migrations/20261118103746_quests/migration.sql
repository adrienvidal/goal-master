-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('OPEN', 'DONE', 'VALIDATED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "companion" TEXT;

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "link" TEXT,
    "status" "QuestStatus" NOT NULL DEFAULT 'OPEN',
    "offer" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quest_receiverId_status_idx" ON "Quest"("receiverId", "status");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
