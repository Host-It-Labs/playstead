import type {
  AtlasPublicTarget,
  AtlasRevealedTarget,
  AtlasRoundResult,
  Coordinates,
} from '@playstead/shared';
import { ATLAS_TARGETS, type AtlasTarget } from './catalog.js';

export const ATLAS_ROUND_COUNT = 5;
export const ATLAS_BASE_MAX_SCORE = 100;
export const ATLAS_ROUND_MULTIPLIERS = [1, 1, 2, 3, 3] as const;
export const ATLAS_SCORE_CUTOFF_KM = 16_250;

const EARTH_RADIUS_KM = 6_371.0088;

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceInKm(from: Coordinates, to: Coordinates): number {
  const latDelta = degreesToRadians(to.lat - from.lat);
  const lngDelta = degreesToRadians(to.lng - from.lng);
  const fromLat = degreesToRadians(from.lat);
  const toLat = degreesToRadians(to.lat);
  const a =
    Math.sin(latDelta / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scoreGuess(distanceKm: number, multiplier = 1): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || multiplier <= 0) {
    throw new RangeError('Distance and multiplier must be valid positive numbers');
  }
  if (distanceKm >= ATLAS_SCORE_CUTOFF_KM) return 0;
  const base = ATLAS_BASE_MAX_SCORE * Math.exp((-3.5 * distanceKm) / ATLAS_SCORE_CUTOFF_KM);
  return Math.max(0, Math.round(base) * multiplier);
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function nextRandom(state: { value: number }): number {
  let value = state.value || 0x9e3779b9;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.value = value >>> 0;
  return state.value / 4_294_967_296;
}

export function selectTargets(seed: string, count = ATLAS_ROUND_COUNT): AtlasTarget[] {
  if (!seed || !Number.isInteger(count) || count < 1 || count > ATLAS_TARGETS.length) {
    throw new RangeError('A seed and a valid target count are required');
  }
  const shuffled = [...ATLAS_TARGETS];
  const state = { value: hashSeed(seed) };
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(state) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled.slice(0, count);
}

export function findTarget(targetId: string): AtlasTarget {
  const target = ATLAS_TARGETS.find(({ id }) => id === targetId);
  if (!target) throw new RangeError(`Unknown Atlas Drop target: ${targetId}`);
  return target;
}

export function publicTarget(target: AtlasTarget, round: number): AtlasPublicTarget {
  const multiplier = ATLAS_ROUND_MULTIPLIERS[round - 1];
  if (!multiplier) throw new RangeError('Atlas Drop round is out of bounds');
  return { prompt: target.prompt, kind: target.kind, round, multiplier };
}

export function revealedTarget(target: AtlasTarget, round: number): AtlasRevealedTarget {
  return {
    ...publicTarget(target, round),
    id: target.id,
    name: target.name,
    lat: target.lat,
    lng: target.lng,
    story: target.story,
  };
}

export function evaluateGuess(
  target: AtlasTarget,
  round: number,
  guess: Coordinates,
  guessedAt = new Date(),
): AtlasRoundResult {
  const distanceKm = distanceInKm(guess, target);
  const multiplier = ATLAS_ROUND_MULTIPLIERS[round - 1];
  if (!multiplier) throw new RangeError('Atlas Drop round is out of bounds');
  return {
    round,
    guess,
    target: revealedTarget(target, round),
    distanceKm: Math.round(distanceKm * 10) / 10,
    score: scoreGuess(distanceKm, multiplier),
    guessedAt: guessedAt.toISOString(),
  };
}
