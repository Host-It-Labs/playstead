import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { guessSchema, sessionIdParamsSchema } from '@playstead/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { parseInput } from '../common/validation.js';
import type { UserEntity } from '../database/entities.js';
import { DailyService } from './daily.service.js';

@Controller('games/atlas-drop/daily')
@UseGuards(AuthGuard)
export class DailyController {
  constructor(private readonly daily: DailyService) {}

  @Post('start')
  start(@CurrentUser() user: UserEntity) {
    return this.daily.start(user.id);
  }

  @Get(':sessionId')
  get(@CurrentUser() user: UserEntity, @Param('sessionId') sessionId: string) {
    const params = parseInput(sessionIdParamsSchema, { sessionId });
    return this.daily.get(user.id, params.sessionId);
  }

  @Post(':sessionId/guess')
  guess(
    @CurrentUser() user: UserEntity,
    @Param('sessionId') sessionId: string,
    @Body() body: unknown,
  ) {
    const params = parseInput(sessionIdParamsSchema, { sessionId });
    return this.daily.guess(user.id, params.sessionId, parseInput(guessSchema, body));
  }
}
