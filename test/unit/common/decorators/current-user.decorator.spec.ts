import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  factory: undefined as
    ((data: unknown, context: ExecutionContext) => unknown) | undefined,
}));

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nestjs/common')>();

  return {
    ...actual,

    createParamDecorator: vi.fn(
      (factory: (data: unknown, context: ExecutionContext) => unknown) => {
        state.factory = factory;

        return vi.fn();
      },
    ),
  };
});

await import('@quickdialog/common/decorators/current-user.decorator.js');

describe('CurrentUser decorator', () => {
  it('returns request.user', () => {
    const user = {
      userId: 'user-id',
      sessionId: 'session-id',
      hotelId: null,
      role: 'OWNER',
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(state.factory?.(undefined, context)).toEqual(user);
  });
});
