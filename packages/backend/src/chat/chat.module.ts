import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { ChatMessageEntity, ChatRoomEntity, ChatRoomMemberEntity } from '../database/entities.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoomEntity, ChatRoomMemberEntity, ChatMessageEntity]),
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
