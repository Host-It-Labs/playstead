import { describe, expect, it } from 'vitest';
import { formatClock, formatDistance, revealCoordinates } from './format';

describe('display formatting', () => {
  it('keeps short distances readable', () => {
    expect(formatDistance(0.42)).toBe('420 m');
    expect(formatDistance(12.25)).toBe('12.3 km');
  });

  it('formats a deadline without going negative', () => {
    expect(formatClock('2026-01-01T00:01:05.000Z', Date.parse('2026-01-01T00:00:00.000Z'))).toBe(
      '1:05',
    );
    expect(formatClock('2026-01-01T00:00:00.000Z', Date.parse('2026-01-01T00:01:00.000Z'))).toBe(
      '0:00',
    );
  });

  it('accepts either reveal coordinate representation', () => {
    expect(
      revealCoordinates({
        round: 1,
        guess: { lat: 1, lng: 2 },
        target: {
          id: 'target',
          name: 'Somewhere',
          prompt: 'A prompt',
          kind: 'city',
          round: 1,
          multiplier: 1,
          lat: 3,
          lng: 4,
          story: 'A story',
        },
        distanceKm: 1,
        score: 2,
        guessedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({ lat: 3, lng: 4 });
  });
});
