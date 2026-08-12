import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PersistDailyPuzzles1723478460000 implements MigrationInterface {
  name = 'PersistDailyPuzzles1723478460000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "daily_puzzles" (
        "puzzle_date" date PRIMARY KEY,
        "target_ids" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "daily_puzzles"`);
  }
}
