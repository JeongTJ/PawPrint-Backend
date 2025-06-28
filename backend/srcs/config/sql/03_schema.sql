CREATE TABLE IF NOT EXISTS comments (
	"id"          SERIAL PRIMARY KEY,
	"body"        TEXT NOT NULL,
	"likesCount"  INTEGER NOT NULL DEFAULT 0,
	"created_at"  TIMESTAMPTZ DEFAULT now(),
	"updated_at"  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
    "id"          BIGSERIAL PRIMARY KEY,
    "user_id"     TEXT UNIQUE NOT NULL, -- 로그인 ID
    "name"        TEXT NOT NULL,
    "password"    TEXT NOT NULL,
    "profile"     TEXT,
    "status_note" TEXT,
    "created_at"  TIMESTAMPTZ DEFAULT now(),
    "updated_at"  TIMESTAMPTZ DEFAULT now()
);

-- Pet 테이블
CREATE TABLE IF NOT EXISTS pets (
    "id"              BIGSERIAL PRIMARY KEY,
    "member_id"       BIGINT REFERENCES members(id) ON DELETE CASCADE,
    "name"            TEXT NOT NULL,
    "birth_date"      DATE,
    "gender"          TEXT, -- 'Male', 'Female' 등
    "is_neutering"    BOOLEAN DEFAULT FALSE,
    "profile"         TEXT,
    "species"         TEXT, -- '개', '고양이' 등
    "type"            TEXT, -- '푸들', '코리안숏헤어' 등
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now()
);

-- Plan 테이블
CREATE TABLE IF NOT EXISTS plans (
    "id"              BIGSERIAL PRIMARY KEY,
    "member_id"       BIGINT REFERENCES members(id) ON DELETE CASCADE,
    "title"           TEXT NOT NULL,
    "date"            DATE NOT NULL,
    "time"            TIME,
    "is_checked"      BOOLEAN DEFAULT FALSE,
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now()
);

-- Mission 테이블
CREATE TABLE IF NOT EXISTS missions (
    "id"              BIGSERIAL PRIMARY KEY,
    "plan_id"         BIGINT REFERENCES plans(id) ON DELETE CASCADE,
    "title"           TEXT NOT NULL,
    "description"     TEXT,
    "mission_order"   INTEGER,
    "is_done"         BOOLEAN DEFAULT FALSE,
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now()
);

-- Content 테이블
CREATE TABLE IF NOT EXISTS contents (
    "id"              BIGSERIAL PRIMARY KEY,
    "member_id"       BIGINT REFERENCES members(id) ON DELETE CASCADE,
    "body"            TEXT,
    "likes_count"     INTEGER DEFAULT 0,
    "comments_count"  INTEGER DEFAULT 0,
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now()
);

-- Comment 테이블
CREATE TABLE IF NOT EXISTS comments (
    "id"              BIGSERIAL PRIMARY KEY,
    "member_id"       BIGINT REFERENCES members(id) ON DELETE SET NULL, -- 작성자가 탈퇴해도 댓글은 남김
    "content_id"      BIGINT REFERENCES contents(id) ON DELETE CASCADE,
    "body"            TEXT NOT NULL,
    "likes_count"     INTEGER DEFAULT 0,
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now()
);

-- Memory 테이블
CREATE TABLE IF NOT EXISTS memories (
    "id"              BIGSERIAL PRIMARY KEY,
    "pet_id"          BIGINT REFERENCES pets(id) ON DELETE CASCADE,
    "body"            TEXT,
    "date"            DATE,
    "count"           INTEGER, -- 특정 행동 횟수 등
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now()
);

-- Media 테이블
CREATE TABLE IF NOT EXISTS media (
    "id"              BIGSERIAL PRIMARY KEY,
    "content_id"      BIGINT REFERENCES contents(id) ON DELETE CASCADE,
    "memory_id"       BIGINT REFERENCES memories(id) ON DELETE CASCADE,
    "file_path"       TEXT NOT NULL,
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now(),
    -- content_id와 memory_id 중 하나만 값이 있도록 제약조건 추가
    CONSTRAINT chk_media_parent CHECK (("content_id" IS NOT NULL AND "memory_id" IS NULL) OR ("content_id" IS NULL AND "memory_id" IS NOT NULL))
);

-- Tag 테이블
CREATE TABLE IF NOT EXISTS tags (
    "id"              BIGSERIAL PRIMARY KEY,
    "name"            TEXT UNIQUE NOT NULL,
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now()
);

-- MemoryTagMap 테이블 (다대다 관계)
CREATE TABLE IF NOT EXISTS memory_tag_maps (
    "id"              BIGSERIAL PRIMARY KEY,
    "memory_id"       BIGINT REFERENCES memories(id) ON DELETE CASCADE,
    "tag_id"          BIGINT REFERENCES tags(id) ON DELETE CASCADE,
    "created_at"      TIMESTAMPTZ DEFAULT now(),
    "updated_at"      TIMESTAMPTZ DEFAULT now(),
    UNIQUE("memory_id", "tag_id")
);


-- 성능 향상을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS pets_member_id_idx ON pets(member_id);
CREATE INDEX IF NOT EXISTS plans_member_id_idx ON plans(member_id);
CREATE INDEX IF NOT EXISTS missions_plan_id_idx ON missions(plan_id);
CREATE INDEX IF NOT EXISTS contents_member_id_idx ON contents(member_id);
CREATE INDEX IF NOT EXISTS comments_member_id_idx ON comments(member_id);
CREATE INDEX IF NOT EXISTS comments_content_id_idx ON comments(content_id);
CREATE INDEX IF NOT EXISTS memories_pet_id_idx ON memories(pet_id);
CREATE INDEX IF NOT EXISTS media_content_id_idx ON media(content_id);
CREATE INDEX IF NOT EXISTS media_memory_id_idx ON media(memory_id);
CREATE INDEX IF NOT EXISTS memory_tag_maps_memory_id_idx ON memory_tag_maps(memory_id);
CREATE INDEX IF NOT EXISTS memory_tag_maps_tag_id_idx ON memory_tag_maps(tag_id);