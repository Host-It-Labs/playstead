import type { Socket } from 'socket.io-client';
import type { MatchSnapshot } from '../types';
import { emitWithAck } from './socket';

type MatchPhase = Pick<MatchSnapshot, 'round' | 'state'>;

export const CURRENT_MATCH_STORAGE_KEY = 'playstead-current-match';

export function readCurrentMatchId(storage: Pick<Storage, 'getItem'>): string | null {
  return storage.getItem(CURRENT_MATCH_STORAGE_KEY);
}

export function saveCurrentMatchId(storage: Pick<Storage, 'setItem'>, matchId: string): void {
  storage.setItem(CURRENT_MATCH_STORAGE_KEY, matchId);
}

export function clearCurrentMatchId(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(CURRENT_MATCH_STORAGE_KEY);
}

export async function subscribeToMatch(socket: Socket, matchId: string): Promise<MatchSnapshot> {
  const snapshot = await emitWithAck<MatchSnapshot>(socket, 'match:subscribe', { matchId });
  if (!snapshot) throw new Error('The table did not return its current state.');
  return snapshot;
}

export function shouldResetMatchGuess(previous: MatchPhase, next: MatchPhase): boolean {
  return (
    next.state === 'round_open' &&
    (previous.state !== 'round_open' || previous.round !== next.round)
  );
}
