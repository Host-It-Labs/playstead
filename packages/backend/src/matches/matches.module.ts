import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { MatchEntity, MatchGuessEntity, MatchPlayerEntity } from '../database/entities.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchEntity, MatchPlayerEntity, MatchGuessEntity]),
    AuthModule,
    ChatModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService, RealtimeGateway],
  exports: [MatchesService],
})
export class MatchesModule {}
