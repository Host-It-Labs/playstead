import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ATLAS_ROUND_COUNT,
  evaluateGuess,
  findTarget,
  publicTarget,
  revealedTarget,
  selectTargets,
} from '@playstead/game-atlas-drop';
import type {
  DailyGuessResponse,
  DailySession,
  DailySessionResponse,
  GuessInput,
} from '@playstead/shared';
import { randomBytes } from 'node:crypto';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { currentDateInZone } from '../common/date.js';
import { DailyGuessEntity, DailyPuzzleEntity, DailySessionEntity } from '../database/entities.js';

@Injectable()
export class DailyService {
  constructor(
    @InjectRepository(DailyPuzzleEntity) private readonly puzzles: Repository<DailyPuzzleEntity>,
    @InjectRepository(DailySessionEntity) private readonly sessions: Repository<DailySessionEntity>,
    @InjectRepository(DailyGuessEntity) private readonly guesses: Repository<DailyGuessEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async start(userId: string): Promise<DailySessionResponse> {
    const date = currentDateInZone();
    let session = await this.sessions.findOneBy({ userId, puzzleDate: date });
    if (!session) {
      const targetIds = await this.targetIdsForDate(date);
      session = this.sessions.create({
        userId,
        puzzleDate: date,
        targetIds,
        currentRound: 1,
        totalScore: 0,
        status: 'in_progress',
        completedAt: null,
      });
      try {
        await this.sessions.save(session);
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
        session = await this.sessions.findOneByOrFail({ userId, puzzleDate: date });
      }
    }
    return { session: await this.serialize(session) };
  }

  private async targetIdsForDate(date: string): Promise<string[]> {
    let puzzle = await this.puzzles.findOneBy({ puzzleDate: date });
    if (!puzzle) {
      puzzle = this.puzzles.create({
        puzzleDate: date,
        targetIds: selectTargets(randomBytes(32).toString('hex')).map(({ id }) => id),
      });
      try {
        puzzle = await this.puzzles.save(puzzle);
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
        puzzle = await this.puzzles.findOneByOrFail({ puzzleDate: date });
      }
    }
    return puzzle.targetIds;
  }

  async get(userId: string, sessionId: string): Promise<DailySessionResponse> {
    const session = await this.sessions.findOneBy({ id: sessionId, userId });
    if (!session) throw new NotFoundException('Daily expedition not found');
    return { session: await this.serialize(session) };
  }

  async guess(userId: string, sessionId: string, input: GuessInput): Promise<DailyGuessResponse> {
    return this.dataSource.transaction('READ COMMITTED', async (manager) => {
      const session = await manager.getRepository(DailySessionEntity).findOne({
        where: { id: sessionId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('Daily expedition not found');
      if (session.status === 'completed')
        throw new ConflictException('This expedition is already complete');

      const round = session.currentRound;
      const target = findTarget(session.targetIds[round - 1]!);
      const result = evaluateGuess(target, round, input);
      await manager.getRepository(DailyGuessEntity).save(
        manager.getRepository(DailyGuessEntity).create({
          sessionId: session.id,
          round,
          targetId: target.id,
          guessLat: input.lat,
          guessLng: input.lng,
          distanceKm: result.distanceKm,
          score: result.score,
          guessedAt: new Date(result.guessedAt),
        }),
      );

      session.totalScore += result.score;
      if (round === ATLAS_ROUND_COUNT) {
        session.status = 'completed';
        session.completedAt = new Date();
      } else {
        session.currentRound += 1;
      }
      await manager.getRepository(DailySessionEntity).save(session);
      return { session: await this.serialize(session, manager), lastReveal: result };
    });
  }

  private async serialize(
    session: DailySessionEntity,
    manager?: EntityManager,
  ): Promise<DailySession> {
    const repository = manager?.getRepository(DailyGuessEntity) ?? this.guesses;
    const guesses = await repository.find({
      where: { sessionId: session.id },
      order: { round: 'ASC' },
    });
    const results = guesses.map((guess) => ({
      round: guess.round,
      guess: { lat: guess.guessLat, lng: guess.guessLng },
      target: revealedTarget(findTarget(guess.targetId), guess.round),
      distanceKm: guess.distanceKm,
      score: guess.score,
      guessedAt: guess.guessedAt.toISOString(),
    }));
    const target =
      session.status === 'in_progress'
        ? publicTarget(
            findTarget(session.targetIds[session.currentRound - 1]!),
            session.currentRound,
          )
        : null;
    return {
      id: session.id,
      date: session.puzzleDate,
      status: session.status,
      currentRound: session.currentRound,
      totalRounds: ATLAS_ROUND_COUNT,
      totalScore: session.totalScore,
      target,
      results,
      completedAt: session.completedAt?.toISOString() ?? null,
    };
  }
}
