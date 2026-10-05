import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RolesGuard } from '@quickdialog/common/guards/roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const getAllAndOverride = vi.fn();

  const reflector = {
    getAllAndOverride,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = moduleRef.get(RolesGuard);
  });

  function createContext(user?: {
    role: 'OWNER' | 'STAFF' | 'SUPER_ADMIN';
  }): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),

      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access when no roles are required', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows access when required roles list is empty', () => {
    getAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows a user with the required role', () => {
    getAllAndOverride.mockReturnValue(['OWNER']);

    expect(
      guard.canActivate(
        createContext({
          role: 'OWNER',
        }),
      ),
    ).toBe(true);
  });

  it('returns false when authenticated user is missing', () => {
    getAllAndOverride.mockReturnValue(['OWNER']);

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('throws 403 when role is not allowed', () => {
    getAllAndOverride.mockReturnValue(['OWNER']);

    expect(() =>
      guard.canActivate(
        createContext({
          role: 'STAFF',
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
