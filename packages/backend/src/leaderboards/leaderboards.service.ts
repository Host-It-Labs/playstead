import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { LeaderboardEntry, LeaderboardResponse } from '@playstead/shared';
import { Repository } from 'typeorm';
import { currentDateInZone } from '../common/date.js';
import { DailySessionEntity, MatchPlayerEntity } from '../database/entities.js';

type RawEntry = {
  userId: string;
  handle: string;
  score: string | number;
  gamesPlayed: string | number;
  achievedAt: Date | string | null;
};

@Injectable()
export class LeaderboardsService {
  constructor(
    @InjectRepository(DailySessionEntity) private readonly sessions: Repository<DailySessionEntity>,
    @InjectRepository(MatchPlayerEntity) private readonly players: Repository<MatchPlayerEntity>,
  ) {}

  async daily(date = currentDateInZone(), limit = 50): Promise<LeaderboardResponse> {
    const rows = await this.sessions
      .createQueryBuilder('session')
      .innerJoin('session.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.handle', 'handle')
      .addSelect('session.totalScore', 'score')
      .addSelect('1', 'gamesPlayed')
      .addSelect('session.completedAt', 'achievedAt')
      .where('session.puzzleDate = :date', { date })
      .andWhere('session.status = :status', { status: 'completed' })
      .orderBy('session.totalScore', 'DESC')
      .addOrderBy('session.completedAt', 'ASC')
      .limit(limit)
      .getRawMany<RawEntry>();
    return { kind: 'daily', date, entries: this.rank(rows) };
  }

  async allTime(limit = 50): Promise<LeaderboardResponse> {
    const rows = await this.sessions
      .createQueryBuilder('session')
      .innerJoin('session.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.handle', 'handle')
      .addSelect('SUM(session.totalScore)', 'score')
      .addSelect('COUNT(session.id)', 'gamesPlayed')
      .addSelect('MAX(session.completedAt)', 'achievedAt')
      .where('session.status = :status', { status: 'completed' })
      .groupBy('user.id')
      .addGroupBy('user.handle')
      .orderBy('SUM(session.totalScore)', 'DESC')
      .limit(limit)
      .getRawMany<RawEntry>();
    return { kind: 'all-time', entries: this.rank(rows) };
  }

  async multiplayer(limit = 50): Promise<LeaderboardResponse> {
    const rows = await this.players
      .createQueryBuilder('player')
      .innerJoin('player.user', 'user')
      .innerJoin('player.match', 'match')
      .select('user.id', 'userId')
      .addSelect('user.handle', 'handle')
      .addSelect('SUM(player.totalScore)', 'score')
      .addSelect('COUNT(player.id)', 'gamesPlayed')
      .addSelect('MAX(match.finishedAt)', 'achievedAt')
      .where('match.state = :state', { state: 'finished' })
      .groupBy('user.id')
      .addGroupBy('user.handle')
      .orderBy('SUM(player.totalScore)', 'DESC')
      .limit(limit)
      .getRawMany<RawEntry>();
    return { kind: 'multiplayer', entries: this.rank(rows) };
  }

  private rank(rows: RawEntry[]): LeaderboardEntry[] {
    return rows.map((row, index) => ({
      rank: index + 1,
      user: { id: row.userId, handle: row.handle },
      score: Number(row.score),
      gamesPlayed: Number(row.gamesPlayed),
      achievedAt: row.achievedAt ? new Date(row.achievedAt).toISOString() : null,
    }));
  }
}
