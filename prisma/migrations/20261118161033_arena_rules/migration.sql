-- AlterTable
ALTER TABLE "Arena" ADD COLUMN     "rules" INTEGER NOT NULL DEFAULT 3;

-- Les combats existants gardent les règles v2 sous lesquelles ils ont commencé.
UPDATE "Arena" SET "rules" = 2;
