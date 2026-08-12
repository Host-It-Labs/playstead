import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { DailyGuessEntity, DailyPuzzleEntity, DailySessionEntity } from '../database/entities.js';
import { DailyController } from './daily.controller.js';
import { DailyService } from './daily.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyPuzzleEntity, DailySessionEntity, DailyGuessEntity]),
    AuthModule,
  ],
  controllers: [DailyController],
  providers: [DailyService],
})
export class DailyModule {}
