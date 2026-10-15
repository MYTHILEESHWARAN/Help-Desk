-- CreateExtension: pg_trgm for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateExtension: pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('hardware', 'network', 'software', 'account_access');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('employee', 'technician');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('created', 'status_change', 'assignment');

-- CreateTable: users
CREATE TABLE "users" (
    "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
    "username"      TEXT        NOT NULL,
    "full_name"     TEXT        NOT NULL,
    "email"         TEXT        NOT NULL,
    "password_hash" TEXT        NOT NULL,
    "role"          "Role"      NOT NULL,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key"    ON "users"("email");

-- CreateTable: tickets
CREATE TABLE "tickets" (
    "id"                     UUID         NOT NULL DEFAULT gen_random_uuid(),
    "title"                  VARCHAR(120) NOT NULL,
    "description"            VARCHAR(5000) NOT NULL,
    "category"               "Category"   NOT NULL,
    "priority"               "Priority"   NOT NULL,
    "status"                 "Status"     NOT NULL DEFAULT 'open',
    "reported_by"            UUID         NOT NULL,
    "assigned_to"            UUID,
    "idempotency_key"        TEXT,
    "summary"                TEXT,
    "ai_suggested_category"  "Category",
    "ai_suggested_priority"  "Priority",
    "created_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updated_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tickets_idempotency_key_key" ON "tickets"("idempotency_key");

-- Indexes on tickets for query performance
CREATE INDEX "tickets_status_idx"      ON "tickets"("status");
CREATE INDEX "tickets_priority_idx"    ON "tickets"("priority");
CREATE INDEX "tickets_category_idx"    ON "tickets"("category");
CREATE INDEX "tickets_reported_by_idx" ON "tickets"("reported_by");
CREATE INDEX "tickets_assigned_to_idx" ON "tickets"("assigned_to");
CREATE INDEX "tickets_created_at_idx"  ON "tickets"("created_at");

-- GIN full-text search index on title + description
CREATE INDEX "tickets_fts_idx" ON "tickets"
    USING GIN (to_tsvector('english', "title" || ' ' || "description"));

-- GIN trigram index on title for fuzzy search
CREATE INDEX "tickets_title_trgm_idx" ON "tickets"
    USING GIN ("title" gin_trgm_ops);

-- auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tickets_updated_at
    BEFORE UPDATE ON "tickets"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CreateTable: status_history
CREATE TABLE "status_history" (
    "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id"   UUID        NOT NULL,
    "event_type"  "EventType" NOT NULL,
    "from_status" "Status",
    "to_status"   "Status"    NOT NULL,
    "changed_by"  UUID        NOT NULL,
    "note"        TEXT,
    "changed_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "status_history_ticket_id_idx"  ON "status_history"("ticket_id");
CREATE INDEX "status_history_changed_at_idx" ON "status_history"("changed_at");

-- CreateTable: comments
CREATE TABLE "comments" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id"  UUID         NOT NULL,
    "author_id"  UUID         NOT NULL,
    "body"       VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comments_ticket_id_idx" ON "comments"("ticket_id");

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID        NOT NULL,
    "ticket_id"  UUID        NOT NULL,
    "message"    TEXT        NOT NULL,
    "read"       BOOLEAN     NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_read_idx"    ON "notifications"("read");

-- AddForeignKey: tickets → users (reporter)
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_reported_by_fkey"
    FOREIGN KEY ("reported_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: tickets → users (assignee)
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: status_history → tickets
ALTER TABLE "status_history"
    ADD CONSTRAINT "status_history_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: status_history → users (actor)
ALTER TABLE "status_history"
    ADD CONSTRAINT "status_history_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: comments → tickets
ALTER TABLE "comments"
    ADD CONSTRAINT "comments_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: comments → users (author)
ALTER TABLE "comments"
    ADD CONSTRAINT "comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: notifications → users
ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: notifications → tickets
ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
