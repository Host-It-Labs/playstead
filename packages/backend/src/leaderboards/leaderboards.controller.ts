import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { leaderboardQuerySchema } from '@playstead/shared';
import { AuthGuard } from '../auth/auth.guard.js';
import { currentDateInZone } from '../common/date.js';
import { parseInput } from '../common/validation.js';
import { LeaderboardsService } from './leaderboards.service.js';

@Controller('leaderboards')
@UseGuards(AuthGuard)
export class LeaderboardsController {
  constructor(private readonly leaderboards: LeaderboardsService) {}

  @Get('daily')
  daily(@Query() query: unknown) {
    const parsed = parseInput(leaderboardQuerySchema, query);
    return this.leaderboards.daily(parsed.date ?? currentDateInZone(), parsed.limit);
  }

  @Get('all-time')
  allTime(@Query() query: unknown) {
    const parsed = parseInput(leaderboardQuerySchema.omit({ date: true }), query);
    return this.leaderboards.allTime(parsed.limit);
  }

  @Get('multiplayer')
  multiplayer(@Query() query: unknown) {
    const parsed = parseInput(leaderboardQuerySchema.omit({ date: true }), query);
    return this.leaderboards.multiplayer(parsed.limit);
  }
}
