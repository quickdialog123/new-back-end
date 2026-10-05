import { describe, expect, it } from 'vitest';

import {
  durationToMs,
  generateRefreshToken,
  hashRefreshToken,
} from '@quickdialog/auth/auth.utils.js';

describe('auth.utils', () => {
  describe('generateRefreshToken', () => {
    it('generates a non-empty refresh token', () => {
      const token = generateRefreshToken();

      expect(token).toBeTypeOf('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('generates a different token every time', () => {
      const first = generateRefreshToken();
      const second = generateRefreshToken();

      expect(first).not.toBe(second);
    });
  });

  describe('hashRefreshToken', () => {
    it('returns the same hash for the same token', () => {
      const token = 'refresh-token';

      expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    });

    it('returns different hashes for different tokens', () => {
      expect(hashRefreshToken('token-a')).not.toBe(hashRefreshToken('token-b'));
    });

    it('does not return the raw token', () => {
      const token = 'refresh-token';

      expect(hashRefreshToken(token)).not.toBe(token);
    });

    it('returns a SHA-256 hex hash', () => {
      const hash = hashRefreshToken('refresh-token');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('durationToMs', () => {
    it.each([
      ['30s', 30_000],
      ['15m', 900_000],
      ['2h', 7_200_000],
      ['7d', 604_800_000],
    ])('converts %s to milliseconds', (duration, expected) => {
      expect(durationToMs(duration)).toBe(expected);
    });

    it('throws for an invalid duration', () => {
      expect(() => durationToMs('10x')).toThrow('Invalid duration: 10x');
    });
  });
});
