-- CreateEnum
CREATE TYPE "Landscape" AS ENUM ('CASTLE', 'BAMBOO', 'MOUNTAINS', 'PLAINS');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "landscape" "Landscape" NOT NULL DEFAULT 'CASTLE';
