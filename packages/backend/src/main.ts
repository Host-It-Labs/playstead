import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { assertTimeZone } from './common/date.js';
import { RedisIoAdapter } from './realtime/redis-io.adapter.js';

async function bootstrap(): Promise<void> {
  assertTimeZone(process.env.DAILY_TIME_ZONE ?? 'UTC');
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.APP_ORIGIN ?? 'http://localhost:5174', credentials: true });
  const redisAdapter = new RedisIoAdapter(app, process.env.REDIS_URL ?? 'redis://localhost:56379');
  await redisAdapter.connect();
  app.useWebSocketAdapter(redisAdapter);
  await app.listen(Number(process.env.PORT ?? 3005));
}

void bootstrap();
