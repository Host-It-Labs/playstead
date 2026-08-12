import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { DailySessionEntity, MatchPlayerEntity } from '../database/entities.js';
import { LeaderboardsController } from './leaderboards.controller.js';
import { LeaderboardsService } from './leaderboards.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DailySessionEntity, MatchPlayerEntity]), AuthModule],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService],
})
export class LeaderboardsModule {}
