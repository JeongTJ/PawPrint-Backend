/*
  Warnings:

  - You are about to drop the column `is_checked` on the `plans` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "plans" DROP COLUMN "is_checked",
ADD COLUMN     "color" TEXT DEFAULT '#4A90E2',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_all_day" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "reminder_minutes" INTEGER[];

-- CreateTable
CREATE TABLE "plan_reminders" (
    "id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "reminder_time" TIMESTAMP(3) NOT NULL,
    "minutes_before" INTEGER NOT NULL,
    "is_triggered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_reminders_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "plan_reminders" ADD CONSTRAINT "plan_reminders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
