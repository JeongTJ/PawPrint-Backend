/*
  Warnings:

  - You are about to drop the column `is_neutering` on the `pets` table. All the data in the column will be lost.
  - You are about to drop the column `species` on the `pets` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `pets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pets" DROP COLUMN "is_neutering",
DROP COLUMN "species",
DROP COLUMN "type";
