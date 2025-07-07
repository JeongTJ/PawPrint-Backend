/*
  Warnings:

  - You are about to drop the column `image_url` on the `mission_memories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "mission_memories" DROP COLUMN "image_url";

-- CreateTable
CREATE TABLE "mission_images" (
    "id" SERIAL NOT NULL,
    "mission_memory_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mission_images" ADD CONSTRAINT "mission_images_mission_memory_id_fkey" FOREIGN KEY ("mission_memory_id") REFERENCES "mission_memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
