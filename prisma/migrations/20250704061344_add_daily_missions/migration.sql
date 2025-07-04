-- CreateTable
CREATE TABLE "mission_templates" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_missions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "mission_template_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_memories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "daily_mission_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_missions_user_id_mission_template_id_date_key" ON "daily_missions"("user_id", "mission_template_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "mission_memories_daily_mission_id_key" ON "mission_memories"("daily_mission_id");

-- AddForeignKey
ALTER TABLE "daily_missions" ADD CONSTRAINT "daily_missions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_missions" ADD CONSTRAINT "daily_missions_mission_template_id_fkey" FOREIGN KEY ("mission_template_id") REFERENCES "mission_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_memories" ADD CONSTRAINT "mission_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_memories" ADD CONSTRAINT "mission_memories_daily_mission_id_fkey" FOREIGN KEY ("daily_mission_id") REFERENCES "daily_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
