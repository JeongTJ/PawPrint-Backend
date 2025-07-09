/*
  Warnings:

  - You are about to drop the column `plan_id` on the `missions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "missions" DROP CONSTRAINT "missions_plan_id_fkey";

-- AlterTable
ALTER TABLE "missions" DROP COLUMN "plan_id";
