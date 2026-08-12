import { describe, expect, it } from 'vitest';
import { ATLAS_TARGETS } from './catalog.js';
import {
  ATLAS_BASE_MAX_SCORE,
  ATLAS_ROUND_COUNT,
  ATLAS_ROUND_MULTIPLIERS,
  distanceInKm,
  scoreGuess,
  selectTargets,
} from './game.js';

describe('Atlas Drop catalog', () => {
  it('contains a broad original target set', () => {
    expect(ATLAS_TARGETS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ATLAS_TARGETS.map(({ id }) => id)).size).toBe(ATLAS_TARGETS.length);
    expect(new Set(ATLAS_TARGETS.map(({ kind }) => kind))).toEqual(
      new Set(['city', 'landmark', 'nature']),
    );
  });
});

describe('seeded target selection', () => {
  it('selects the same five targets for the same private seed', () => {
    const first = selectTargets('private-server-seed').map(({ id }) => id);
    const second = selectTargets('private-server-seed').map(({ id }) => id);
    expect(first).toEqual(second);
    expect(first).toHaveLength(ATLAS_ROUND_COUNT);
  });

  it('never repeats a target within one selection', () => {
    for (let seed = 1; seed <= 31; seed += 1) {
      const ids = selectTargets(`private-seed-${seed}`).map(({ id }) => id);
      expect(new Set(ids).size).toBe(ATLAS_ROUND_COUNT);
    }
    expect(new Set(selectTargets('a-large-table', 30).map(({ id }) => id)).size).toBe(30);
  });

  it('varies selections between private seeds', () => {
    expect(selectTargets('private-seed-a').map(({ id }) => id)).not.toEqual(
      selectTargets('private-seed-b').map(({ id }) => id),
    );
  });
});

describe('server scoring', () => {
  it('uses great-circle distance', () => {
    expect(distanceInKm({ lat: 48.8566, lng: 2.3522 }, { lat: 51.5074, lng: -0.1278 })).toBeCloseTo(
      343.5,
      0,
    );
  });

  it('awards the maximum at the target and decreases with distance', () => {
    expect(scoreGuess(0)).toBe(ATLAS_BASE_MAX_SCORE);
    expect(scoreGuess(500)).toBeGreaterThan(scoreGuess(2_000));
    expect(scoreGuess(2_000)).toBeGreaterThan(scoreGuess(10_000));
    expect(scoreGuess(16_250)).toBe(0);
  });

  it('caps a perfect five-round expedition at exactly 1000 points', () => {
    expect(
      ATLAS_ROUND_MULTIPLIERS.reduce((sum, multiplier) => sum + scoreGuess(0, multiplier), 0),
    ).toBe(1_000);
  });
});
