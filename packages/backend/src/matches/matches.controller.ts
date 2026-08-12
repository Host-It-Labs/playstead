import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { createMatchSchema, joinMatchSchema, matchIdParamsSchema } from '@playstead/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { parseInput } from '../common/validation.js';
import type { UserEntity } from '../database/entities.js';
import { MatchesService } from './matches.service.js';

@Controller('matches')
@UseGuards(AuthGuard)
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post()
  create(@CurrentUser() user: UserEntity, @Body() body: unknown) {
    return this.matches.create(user, parseInput(createMatchSchema, body));
  }

  @Post('join')
  join(@CurrentUser() user: UserEntity, @Body() body: unknown) {
    return this.matches.join(user.id, parseInput(joinMatchSchema, body));
  }

  @Get('public')
  publicTables() {
    return this.matches.listPublic();
  }

  @Get(':matchId')
  get(@CurrentUser() user: UserEntity, @Param('matchId') matchId: string) {
    const params = parseInput(matchIdParamsSchema, { matchId });
    return this.matches.get(user.id, params.matchId);
  }
}
