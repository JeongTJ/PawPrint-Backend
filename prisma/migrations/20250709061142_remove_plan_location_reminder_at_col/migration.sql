/*
  Warnings:

  - You are about to drop the column `location` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `reminder_at` on the `plans` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "plans" DROP COLUMN "location",
DROP COLUMN "reminder_at";
