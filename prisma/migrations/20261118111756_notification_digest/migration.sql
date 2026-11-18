-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "event" JSONB,
ADD COLUMN     "mailedAt" TIMESTAMP(3);
