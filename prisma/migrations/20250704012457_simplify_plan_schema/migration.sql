/*
  Warnings:

  - You are about to drop the column `color` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `is_all_day` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_minutes` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the `plan_reminders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "plan_reminders" DROP CONSTRAINT "plan_reminders_plan_id_fkey";

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "color",
DROP COLUMN "is_all_day",
DROP COLUMN "reminder_minutes",
ADD COLUMN     "reminder_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "plan_reminders";
