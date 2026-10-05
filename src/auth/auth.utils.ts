import { createHash, randomBytes } from 'node:crypto';

type DurationUnit = 's' | 'm' | 'h' | 'd';

const DURATION_TO_MS: Record<DurationUnit, number> = {
  s: 1_000,
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
};

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function durationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);

  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2] as DurationUnit;

  return value * DURATION_TO_MS[unit];
}
