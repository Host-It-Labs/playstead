import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
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
  CreateMatchInput,
  JoinMatchInput,
  MatchGuessInput,
  MatchSnapshot,
  PublicMatchesResponse,
} from '@playstead/shared';
import { randomBytes } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import {
  MatchEntity,
  MatchGuessEntity,
  MatchPlayerEntity,
  UserEntity,
} from '../database/entities.js';

type MatchEmitter = (match: MatchSnapshot) => void;

@Injectable()
export class MatchesService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private emitUpdate: MatchEmitter | null = null;
  private readonly roundMs = Math.max(10, Number(process.env.MATCH_ROUND_SECONDS ?? 45)) * 1_000;
  private readonly revealMs = Math.max(2, Number(process.env.MATCH_REVEAL_SECONDS ?? 8)) * 1_000;

  constructor(
    @InjectRepository(MatchEntity) private readonly matches: Repository<MatchEntity>,
    @InjectRepository(MatchPlayerEntity) private readonly players: Repository<MatchPlayerEntity>,
    @InjectRepository(MatchGuessEntity) private readonly guesses: Repository<MatchGuessEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const active = await this.matches.find({
      where: { state: In(['round_open', 'round_reveal']) },
    });
    for (const match of active) this.schedule(match);
  }

  onApplicationShutdown(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  setEmitter(emitter: MatchEmitter): void {
    this.emitUpdate = emitter;
  }

  async create(user: UserEntity, input: CreateMatchInput): Promise<{ match: MatchSnapshot }> {
    let match: MatchEntity | undefined;
    for (let attempt = 0; attempt < 5 && !match; attempt += 1) {
      const code = this.matchCode();
      const candidate = this.matches.create({
        code,
        visibility: input.visibility,
        state: 'lobby',
        hostUserId: user.id,
        targetIds: selectTargets(randomBytes(32).toString('hex')).map(({ id }) => id),
        currentRound: 0,
        deadlineAt: null,
        revealEndsAt: null,
        startedAt: null,
        finishedAt: null,
      });
      try {
        match = await this.matches.save(candidate);
      } catch (error) {
        if ((error as { code?: string }).code !== '23505') throw error;
      }
    }
    if (!match) throw new Error('Could not allocate a unique table code');
    await this.players.save(
      this.players.create({
        matchId: match.id,
        userId: user.id,
        ready: true,
        totalScore: 0,
        roundScore: null,
        hasGuessed: false,
      }),
    );
    return { match: await this.snapshot(match.id) };
  }

  async join(userId: string, input: JoinMatchInput): Promise<{ match: MatchSnapshot }> {
    const match = await this.matches.findOneBy({ code: input.code });
    if (!match) throw new NotFoundException('Live table not found');
    if (await this.players.existsBy({ matchId: match.id, userId })) {
      await this.advanceExpired(match.id);
      return { match: await this.snapshot(match.id) };
    }
    if (match.state !== 'lobby') throw new ConflictException('This table has already started');
    try {
      await this.players.save(
        this.players.create({
          matchId: match.id,
          userId,
          ready: false,
          totalScore: 0,
          roundScore: null,
          hasGuessed: false,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code !== '23505') throw error;
    }
    const snapshot = await this.snapshot(match.id);
    this.notify(snapshot);
    return { match: snapshot };
  }

  async listPublic(): Promise<PublicMatchesResponse> {
    const matches = await this.matches.find({
      where: { visibility: 'public', state: 'lobby' },
      relations: { host: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return {
      matches: await Promise.all(
        matches.map(async (match) => ({
          id: match.id,
          code: match.code,
          visibility: 'public' as const,
          state: 'lobby' as const,
          host: { id: match.hostUserId, handle: match.host.handle },
          playerCount: await this.players.countBy({ matchId: match.id }),
          createdAt: match.createdAt.toISOString(),
        })),
      ),
    };
  }

  async get(userId: string, matchId: string): Promise<{ match: MatchSnapshot }> {
    return { match: await this.assertAccess(userId, matchId) };
  }

  async assertSubscription(userId: string, matchId: string): Promise<MatchSnapshot> {
    return this.assertAccess(userId, matchId);
  }

  private async assertAccess(userId: string, matchId: string): Promise<MatchSnapshot> {
    const match = await this.matches.findOneBy({ id: matchId });
    if (!match) throw new NotFoundException('Live table not found');
    const member = await this.players.existsBy({ matchId, userId });
    if (!member && match.visibility === 'private') {
      throw new ForbiddenException('Join this private table before opening it');
    }
    await this.advanceExpired(matchId);
    return this.snapshot(matchId);
  }

  async ready(userId: string, matchId: string, ready: boolean): Promise<MatchSnapshot> {
    const player = await this.players.findOneBy({ matchId, userId });
    if (!player) throw new ForbiddenException('Join this table first');
    const match = await this.matches.findOneBy({ id: matchId });
    if (!match) throw new NotFoundException('Live table not found');
    if (match.state !== 'lobby')
      throw new ConflictException('Readiness is locked after play begins');
    player.ready = userId === match.hostUserId ? true : ready;
    await this.players.save(player);
    const snapshot = await this.snapshot(matchId);
    this.notify(snapshot);
    return snapshot;
  }

  async start(userId: string, matchId: string): Promise<MatchSnapshot> {
    const match = await this.dataSource.transaction(async (manager) => {
      const entity = await manager.getRepository(MatchEntity).findOne({
        where: { id: matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entity) throw new NotFoundException('Live table not found');
      if (entity.hostUserId !== userId)
        throw new ForbiddenException('Only the host can start this table');
      if (entity.state !== 'lobby') throw new ConflictException('This table has already started');
      const players = await manager.getRepository(MatchPlayerEntity).findBy({ matchId });
      if (players.length < 1 || players.some((player) => !player.ready)) {
        throw new ConflictException('Everyone at the table must be ready');
      }
      const now = new Date();
      entity.state = 'round_open';
      entity.currentRound = 1;
      entity.startedAt = now;
      entity.deadlineAt = new Date(now.getTime() + this.roundMs);
      entity.revealEndsAt = null;
      await manager.getRepository(MatchEntity).save(entity);
      return entity;
    });
    this.schedule(match);
    const snapshot = await this.snapshot(matchId);
    this.notify(snapshot);
    return snapshot;
  }

  async guess(userId: string, input: MatchGuessInput): Promise<MatchSnapshot> {
    await this.advanceExpired(input.matchId);
    const match = await this.dataSource.transaction(async (manager) => {
      const entity = await manager.getRepository(MatchEntity).findOne({
        where: { id: input.matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entity) throw new NotFoundException('Live table not found');
      if (entity.state !== 'round_open' || !entity.deadlineAt || entity.deadlineAt <= new Date()) {
        throw new ConflictException('This round is no longer accepting pins');
      }
      const player = await manager.getRepository(MatchPlayerEntity).findOneBy({
        matchId: entity.id,
        userId,
      });
      if (!player) throw new ForbiddenException('Join this table first');
      if (player.hasGuessed)
        throw new ConflictException('Your pin is already locked for this round');

      const target = findTarget(entity.targetIds[entity.currentRound - 1]!);
      const result = evaluateGuess(target, entity.currentRound, input);
      await manager.getRepository(MatchGuessEntity).save(
        manager.getRepository(MatchGuessEntity).create({
          matchId: entity.id,
          userId,
          round: entity.currentRound,
          targetId: target.id,
          guessLat: input.lat,
          guessLng: input.lng,
          distanceKm: result.distanceKm,
          score: result.score,
          guessedAt: new Date(result.guessedAt),
        }),
      );
      player.hasGuessed = true;
      player.roundScore = result.score;
      player.totalScore += result.score;
      await manager.getRepository(MatchPlayerEntity).save(player);

      const outstanding = await manager.getRepository(MatchPlayerEntity).countBy({
        matchId: entity.id,
        hasGuessed: false,
      });
      if (outstanding === 0) {
        entity.state = 'round_reveal';
        entity.deadlineAt = null;
        entity.revealEndsAt = new Date(Date.now() + this.revealMs);
        await manager.getRepository(MatchEntity).save(entity);
      }
      return entity;
    });
    this.schedule(match);
    const snapshot = await this.snapshot(input.matchId);
    this.notify(snapshot);
    return snapshot;
  }

  async snapshot(matchId: string): Promise<MatchSnapshot> {
    const match = await this.matches.findOneBy({ id: matchId });
    if (!match) throw new NotFoundException('Live table not found');
    const players = await this.players.find({
      where: { matchId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });
    const targetEntity =
      match.currentRound > 0 ? findTarget(match.targetIds[match.currentRound - 1]!) : null;
    const target = targetEntity
      ? match.state === 'round_open'
        ? publicTarget(targetEntity, match.currentRound)
        : revealedTarget(targetEntity, match.currentRound)
      : null;
    return {
      id: match.id,
      code: match.code,
      visibility: match.visibility,
      state: match.state,
      hostUserId: match.hostUserId,
      players: players.map((player) => ({
        userId: player.userId,
        handle: player.user.handle,
        ready: player.ready,
        totalScore:
          match.state === 'round_open' && player.hasGuessed
            ? player.totalScore - (player.roundScore ?? 0)
            : player.totalScore,
        roundScore: match.state === 'round_open' ? null : player.roundScore,
        hasGuessed: player.hasGuessed,
        isHost: player.userId === match.hostUserId,
      })),
      round: match.currentRound,
      totalRounds: ATLAS_ROUND_COUNT,
      target,
      deadlineAt: match.deadlineAt?.toISOString() ?? null,
      revealEndsAt: match.revealEndsAt?.toISOString() ?? null,
      createdAt: match.createdAt.toISOString(),
      startedAt: match.startedAt?.toISOString() ?? null,
      finishedAt: match.finishedAt?.toISOString() ?? null,
    };
  }

  private async advanceExpired(matchId: string): Promise<void> {
    const match = await this.dataSource.transaction(async (manager) => {
      const entity = await manager.getRepository(MatchEntity).findOne({
        where: { id: matchId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entity) return null;
      const now = new Date();
      if (entity.state === 'round_open' && entity.deadlineAt && entity.deadlineAt <= now) {
        entity.state = 'round_reveal';
        entity.deadlineAt = null;
        entity.revealEndsAt = new Date(now.getTime() + this.revealMs);
        await manager.getRepository(MatchEntity).save(entity);
      } else if (
        entity.state === 'round_reveal' &&
        entity.revealEndsAt &&
        entity.revealEndsAt <= now
      ) {
        if (entity.currentRound >= ATLAS_ROUND_COUNT) {
          entity.state = 'finished';
          entity.revealEndsAt = null;
          entity.finishedAt = now;
        } else {
          entity.currentRound += 1;
          entity.state = 'round_open';
          entity.deadlineAt = new Date(now.getTime() + this.roundMs);
          entity.revealEndsAt = null;
          await manager
            .getRepository(MatchPlayerEntity)
            .update({ matchId: entity.id }, { hasGuessed: false, roundScore: null });
        }
        await manager.getRepository(MatchEntity).save(entity);
      }
      return entity;
    });
    if (!match) return;
    this.schedule(match);
    const snapshot = await this.snapshot(matchId);
    this.notify(snapshot);
  }

  private schedule(match: MatchEntity): void {
    const existing = this.timers.get(match.id);
    if (existing) clearTimeout(existing);
    const at =
      match.state === 'round_open'
        ? match.deadlineAt
        : match.state === 'round_reveal'
          ? match.revealEndsAt
          : null;
    if (!at) {
      this.timers.delete(match.id);
      return;
    }
    const timer = setTimeout(
      () => {
        this.timers.delete(match.id);
        void this.advanceExpired(match.id).catch(() => {
          // The next read or process restart will recover this durable transition.
        });
      },
      Math.max(0, at.getTime() - Date.now()) + 10,
    );
    timer.unref();
    this.timers.set(match.id, timer);
  }

  private notify(snapshot: MatchSnapshot): void {
    this.emitUpdate?.(snapshot);
  }

  private matchCode(): string {
    return randomBytes(5).toString('base64url').slice(0, 7).toUpperCase();
  }
}
