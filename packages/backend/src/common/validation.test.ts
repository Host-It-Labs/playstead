import { BadRequestException } from '@nestjs/common';
import { coordinatesSchema } from '@playstead/shared';
import { describe, expect, it } from 'vitest';
import { parseInput } from './validation.js';

describe('parseInput', () => {
  it('returns parsed values for valid socket and HTTP coordinates', () => {
    expect(parseInput(coordinatesSchema, { lat: 48.85, lng: 2.35 })).toEqual({
      lat: 48.85,
      lng: 2.35,
    });
  });

  it('maps schema failures to a client-safe HTTP exception', () => {
    expect(() => parseInput(coordinatesSchema, { lat: 100, lng: 2.35 })).toThrow(
      BadRequestException,
    );
  });
});
