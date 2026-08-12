export type LeaderboardKind = 'daily' | 'all-time' | 'multiplayer';

export function leaderboardPath(kind: LeaderboardKind, limit: number): string {
  return `/leaderboards/${kind}?limit=${limit}`;
}
