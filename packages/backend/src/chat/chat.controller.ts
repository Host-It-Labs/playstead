import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  chatHistoryQuerySchema,
  createChatRoomSchema,
  joinChatRoomSchema,
  roomIdParamsSchema,
} from '@playstead/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { parseInput } from '../common/validation.js';
import type { UserEntity } from '../database/entities.js';
import { ChatService } from './chat.service.js';

@Controller('chat/rooms')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(@CurrentUser() user: UserEntity) {
    return this.chat.listRooms(user.id);
  }

  @Post()
  create(@CurrentUser() user: UserEntity, @Body() body: unknown) {
    return this.chat.createRoom(user.id, parseInput(createChatRoomSchema, body));
  }

  @Post('join')
  join(@CurrentUser() user: UserEntity, @Body() body: unknown) {
    return this.chat.joinRoom(user.id, parseInput(joinChatRoomSchema, body));
  }

  @Get(':roomId/messages')
  history(
    @CurrentUser() user: UserEntity,
    @Param('roomId') roomId: string,
    @Query() query: unknown,
  ) {
    const params = parseInput(roomIdParamsSchema, { roomId });
    const parsedQuery = parseInput(chatHistoryQuerySchema, query);
    return this.chat.history(user.id, params.roomId, parsedQuery.before, parsedQuery.limit ?? 50);
  }
}
