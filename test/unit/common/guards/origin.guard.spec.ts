import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OriginGuard } from '@quickdialog/common/guards/origin.guard.js';

describe('OriginGuard', () => {
  let guard: OriginGuard;

  const getOrThrow = vi.fn();

  const configService = {
    getOrThrow,
  };
  const reflector = {
    getAllAndOverride: vi.fn(),
  };

  function createContext(origin?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            origin,
          },
        }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OriginGuard,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = moduleRef.get(OriginGuard);
  });

  it('allows an approved origin outside production', () => {
    getOrThrow.mockImplementation((key: string) => {
      return key === 'app.corsOrigin'
        ? 'https://app.quickdialog.com'
        : undefined;
    });

    expect(
      guard.canActivate(createContext('https://app.quickdialog.com')),
    ).toBe(true);
  });

  it('allows an approved origin in production', () => {
    getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        'app.corsOrigin': 'https://app.quickdialog.com',
      };

      return values[key];
    });

    expect(
      guard.canActivate(createContext('https://app.quickdialog.com')),
    ).toBe(true);
  });

  it('supports multiple allowed origins', () => {
    getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        'app.corsOrigin':
          'https://app.quickdialog.com,https://admin.quickdialog.com',
      };

      return values[key];
    });

    expect(
      guard.canActivate(createContext('https://admin.quickdialog.com')),
    ).toBe(true);
  });

  it('returns false when Origin is missing', () => {
    getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        'app.corsOrigin': 'https://app.quickdialog.com',
      };

      return values[key];
    });

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('throws 403 for an invalid origin', () => {
    getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        'app.corsOrigin': 'https://app.quickdialog.com',
      };

      return values[key];
    });

    expect(() =>
      guard.canActivate(createContext('https://evil.example')),
    ).toThrow(ForbiddenException);
  });
});
