import type { AtlasRoundResult, Coordinates } from '../types';

export function formatScore(score: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(score));
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: distanceKm < 100 ? 1 : 0 }).format(distanceKm)} km`;
}

export function formatClock(iso?: string | null, now = Date.now()): string {
  if (!iso) return '—';
  const seconds = Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatMessageTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function revealCoordinates(reveal?: AtlasRoundResult | null): Coordinates | null {
  return reveal ? { lat: reveal.target.lat, lng: reveal.target.lng } : null;
}

export function firstArray<T>(value: T[] | Record<string, unknown>, ...keys: string[]): T[] {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}
