import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1723478400000 implements MigrationInterface {
  name = 'InitialSchema1723478400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "handle" varchar(24) NOT NULL,
        "handle_normalized" varchar(24) NOT NULL,
        "password_hash" varchar(72) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_handle_normalized" UNIQUE ("handle_normalized")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "daily_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "puzzle_date" date NOT NULL,
        "target_ids" jsonb NOT NULL,
        "current_round" smallint NOT NULL DEFAULT 1,
        "total_score" integer NOT NULL DEFAULT 0,
        "status" varchar(16) NOT NULL DEFAULT 'in_progress' CHECK ("status" IN ('in_progress', 'completed')),
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_daily_session_user_date" UNIQUE ("user_id", "puzzle_date")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_daily_sessions_date" ON "daily_sessions" ("puzzle_date")`,
    );
    await queryRunner.query(`
      CREATE TABLE "daily_guesses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL REFERENCES "daily_sessions"("id") ON DELETE CASCADE,
        "round" smallint NOT NULL,
        "target_id" varchar(64) NOT NULL,
        "guess_lat" double precision NOT NULL,
        "guess_lng" double precision NOT NULL,
        "distance_km" double precision NOT NULL,
        "score" integer NOT NULL,
        "guessed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_daily_guess_session_round" UNIQUE ("session_id", "round")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_daily_guesses_session" ON "daily_guesses" ("session_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "chat_rooms" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "kind" varchar(16) NOT NULL CHECK ("kind" IN ('commons', 'circle')),
        "name" varchar(48) NOT NULL,
        "invite_code" varchar(12),
        "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_chat_rooms_invite" ON "chat_rooms" ("invite_code") WHERE "invite_code" IS NOT NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE "chat_room_members" (
        "room_id" uuid NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("room_id", "user_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "room_id" uuid NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "body" text,
        "client_nonce" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "uq_chat_message_user_nonce" UNIQUE ("user_id", "client_nonce")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_chat_messages_room_created" ON "chat_messages" ("room_id", "created_at" DESC)`,
    );
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(10) NOT NULL UNIQUE,
        "visibility" varchar(16) NOT NULL CHECK ("visibility" IN ('public', 'private')),
        "state" varchar(20) NOT NULL DEFAULT 'lobby' CHECK ("state" IN ('lobby', 'round_open', 'round_reveal', 'finished')),
        "host_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "target_ids" jsonb NOT NULL,
        "current_round" smallint NOT NULL DEFAULT 0,
        "deadline_at" timestamptz,
        "reveal_ends_at" timestamptz,
        "started_at" timestamptz,
        "finished_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_matches_state" ON "matches" ("state")`);
    await queryRunner.query(`
      CREATE TABLE "match_players" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "ready" boolean NOT NULL DEFAULT false,
        "total_score" integer NOT NULL DEFAULT 0,
        "round_score" integer,
        "has_guessed" boolean NOT NULL DEFAULT false,
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_match_player" UNIQUE ("match_id", "user_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "match_guesses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "match_id" uuid NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "round" smallint NOT NULL,
        "target_id" varchar(64) NOT NULL,
        "guess_lat" double precision NOT NULL,
        "guess_lng" double precision NOT NULL,
        "distance_km" double precision NOT NULL,
        "score" integer NOT NULL,
        "guessed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_match_guess_player_round" UNIQUE ("match_id", "user_id", "round")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "chat_rooms" ("id", "kind", "name", "invite_code", "created_by_id")
      VALUES ('00000000-0000-4000-8000-000000000001', 'commons', 'Commons', NULL, NULL)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "match_guesses"`);
    await queryRunner.query(`DROP TABLE "match_players"`);
    await queryRunner.query(`DROP TABLE "matches"`);
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TABLE "chat_room_members"`);
    await queryRunner.query(`DROP TABLE "chat_rooms"`);
    await queryRunner.query(`DROP TABLE "daily_guesses"`);
    await queryRunner.query(`DROP TABLE "daily_sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
