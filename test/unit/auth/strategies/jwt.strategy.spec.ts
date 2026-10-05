import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtStrategy } from '@quickdialog/auth/strategies/jwt.strategy.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const configService = {
    getOrThrow: vi.fn((key: string) => {
      const values: Record<string, string> = {
        'auth.accessToken.secret': 'test-secret-at-least-32-characters-long',
        'auth.accessToken.issuer': 'quickdialog-api',
        'auth.accessToken.audience': 'quickdialog-web',
      };

      return values[key];
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  it('is defined', () => {
    expect(strategy).toBeDefined();
  });

  it('maps a valid payload to AuthenticatedUser', () => {
    const result = strategy.validate({
      sub: '4e3ee6a0-eec9-47c8-9fe3-e92afe8a2b1b',
      sid: '8d234fad-ceec-4f64-bb1b-1459c0b16cd7',
      hotelId: null,
      role: 'OWNER',
    });

    expect(result).toEqual({
      userId: '4e3ee6a0-eec9-47c8-9fe3-e92afe8a2b1b',
      sessionId: '8d234fad-ceec-4f64-bb1b-1459c0b16cd7',
      hotelId: null,
      role: 'OWNER',
    });
  });

  it('rejects an invalid payload', () => {
    expect(() =>
      strategy.validate({
        sub: '',
        sid: 'invalid',
        hotelId: null,
        role: 'OWNER',
      }),
    ).toThrow(UnauthorizedException);
  });
});
