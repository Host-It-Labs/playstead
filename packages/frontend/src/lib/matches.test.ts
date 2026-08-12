import type { Socket } from 'socket.io-client';
import type { MatchSnapshot } from '../types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emitWithAck } from './socket';
import {
  clearCurrentMatchId,
  CURRENT_MATCH_STORAGE_KEY,
  readCurrentMatchId,
  saveCurrentMatchId,
  shouldResetMatchGuess,
  subscribeToMatch,
} from './matches';

vi.mock('./socket', () => ({ emitWithAck: vi.fn() }));

const snapshot: MatchSnapshot = {
  id: 'match-id',
  code: 'MAPLE7',
  visibility: 'private',
  state: 'round_open',
  hostUserId: 'host-id',
  players: [],
  round: 2,
  totalRounds: 5,
  target: null,
  deadlineAt: '2026-08-12T12:00:00.000Z',
  revealEndsAt: null,
  createdAt: '2026-08-12T11:00:00.000Z',
  startedAt: '2026-08-12T11:55:00.000Z',
  finishedAt: null,
};

describe('match subscription', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns the authoritative snapshot from the subscription acknowledgement', async () => {
    vi.mocked(emitWithAck).mockResolvedValue(snapshot);
    const socket = {} as Socket;

    await expect(subscribeToMatch(socket, snapshot.id)).resolves.toBe(snapshot);
    expect(emitWithAck).toHaveBeenCalledWith(socket, 'match:subscribe', {
      matchId: snapshot.id,
    });
  });

  it('rejects an acknowledgement that omits its snapshot', async () => {
    vi.mocked(emitWithAck).mockResolvedValue(undefined);

    await expect(subscribeToMatch({} as Socket, snapshot.id)).rejects.toThrow(
      'The table did not return its current state.',
    );
  });
});

describe('match round reconciliation', () => {
  it('clears a stale local guess when reconnecting into a newer open round', () => {
    expect(
      shouldResetMatchGuess({ state: 'round_open', round: 1 }, { state: 'round_open', round: 2 }),
    ).toBe(true);
  });

  it('keeps local state for another update in the same open round', () => {
    expect(
      shouldResetMatchGuess({ state: 'round_open', round: 2 }, { state: 'round_open', round: 2 }),
    ).toBe(false);
  });
});

describe('current match storage', () => {
  it('round-trips and explicitly clears the current match id', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    };

    saveCurrentMatchId(storage, snapshot.id);
    expect(readCurrentMatchId(storage)).toBe(snapshot.id);
    expect(storage.setItem).toHaveBeenCalledWith(CURRENT_MATCH_STORAGE_KEY, snapshot.id);

    clearCurrentMatchId(storage);
    expect(readCurrentMatchId(storage)).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(CURRENT_MATCH_STORAGE_KEY);
  });
});
