import { BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new BadRequestException({
    message: parsed.error.issues[0]?.message ?? 'Invalid request',
    issues: parsed.error.flatten(),
  });
}
