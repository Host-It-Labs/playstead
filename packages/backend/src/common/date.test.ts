import { describe, expect, it } from 'vitest';
import { assertTimeZone, currentDateInZone } from './date.js';

describe('currentDateInZone', () => {
  it('returns a valid calendar date in the configured zone', () => {
    expect(currentDateInZone('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rejects an unknown IANA time zone', () => {
    expect(() => currentDateInZone('Nowhere/Imaginary')).toThrow(RangeError);
    expect(() => assertTimeZone('Nowhere/Imaginary')).toThrow(RangeError);
  });
});
