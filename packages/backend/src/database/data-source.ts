import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities.js';

config({ path: resolve(process.cwd(), '../../.env') });
config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ALL_ENTITIES,
  migrations: [resolve(process.cwd(), 'src/database/migrations/*.{ts,js}')],
  synchronize: false,
  migrationsRun: false,
});
