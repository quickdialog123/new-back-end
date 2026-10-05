import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '@quickdialog/common/guards/jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const reflector = {
    getAllAndOverride: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = moduleRef.get(JwtAuthGuard);
  });

  function createContext(): ExecutionContext {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      getType: vi.fn(),
    } as unknown as ExecutionContext;
  }

  it('allows public routes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('checks public metadata on handler and class', () => {
    const context = createContext();

    reflector.getAllAndOverride.mockReturnValue(true);

    void guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      expect.anything(),
      [context.getHandler(), context.getClass()],
    );
  });

  it('delegates protected routes to Passport guard', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const superCanActivate = vi
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(createContext());

    expect(result).toBe(true);
    expect(superCanActivate).toHaveBeenCalled();

    superCanActivate.mockRestore();
  });
});
