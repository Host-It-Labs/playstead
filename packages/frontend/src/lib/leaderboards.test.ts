import { describe, expect, it } from 'vitest';
import { leaderboardPath } from './leaderboards';

describe('leaderboard paths', () => {
  it('lets the backend choose the instance-local date for daily scores', () => {
    expect(leaderboardPath('daily', 5)).toBe('/leaderboards/daily?limit=5');
    expect(leaderboardPath('daily', 50)).not.toContain('date=');
  });

  it('builds the non-daily board paths consistently', () => {
    expect(leaderboardPath('all-time', 50)).toBe('/leaderboards/all-time?limit=50');
    expect(leaderboardPath('multiplayer', 50)).toBe('/leaderboards/multiplayer?limit=50');
  });
});
