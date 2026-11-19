-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "walkers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Par défaut, le compagnon affiché se balade.
UPDATE "Player" SET "walkers" = ARRAY["companion"] WHERE "companion" IS NOT NULL;
