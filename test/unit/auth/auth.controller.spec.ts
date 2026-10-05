import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController } from '@quickdialog/auth/auth.controller.js';
import { AuthService } from '@quickdialog/auth/auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
  };

  const configValues: Record<string, string> = {
    'app.prefix': 'api',
    'app.nodeEnv': 'test',
    'auth.refreshToken.ttl': '7d',
  };

  const configService = {
    getOrThrow: vi.fn((key: string) => configValues[key]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    configValues['app.nodeEnv'] = 'test';

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  function createReply() {
    return {
      setCookie: vi.fn(),
      clearCookie: vi.fn(),
    };
  }

  function createRequest(overrides: Record<string, unknown> = {}) {
    return {
      ip: '127.0.0.1',

      headers: {
        'user-agent': 'Vitest',
      },

      cookies: {
        refresh_token: 'refresh-token',
      },

      ...overrides,
    };
  }

  it('logs in, sets refresh cookie, and returns access token', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',

      refreshToken: 'refresh-token',
    });

    const response = createReply();

    const result = await controller.login(
      {
        email: 'owner@example.com',

        password: 'Password123!',
      },

      createRequest() as never,

      response as never,
    );

    expect(authService.login).toHaveBeenCalledWith(
      {
        email: 'owner@example.com',

        password: 'Password123!',
      },

      {
        ipAddress: '127.0.0.1',

        userAgent: 'Vitest',
      },
    );

    expect(response.setCookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 604800,
      },
    );

    expect(result).toEqual({
      accessToken: 'access-token',
    });
  });

  it('sets secure cookie in production', async () => {
    configValues['app.nodeEnv'] = 'production';

    authService.login.mockResolvedValue({
      accessToken: 'access-token',

      refreshToken: 'refresh-token',
    });

    const response = createReply();

    await controller.login(
      {
        email: 'owner@example.com',

        password: 'Password123!',
      },

      createRequest() as never,

      response as never,
    );

    expect(response.setCookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.objectContaining({
        secure: true,
      }),
    );
  });

  it('handles missing user-agent metadata', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',

      refreshToken: 'refresh-token',
    });

    const response = createReply();

    const request = createRequest({
      headers: {},
    });

    await controller.login(
      {
        email: 'owner@example.com',

        password: 'Password123!',
      },

      request as never,

      response as never,
    );

    expect(authService.login).toHaveBeenCalledWith(
      expect.anything(),

      {
        ipAddress: '127.0.0.1',

        userAgent: undefined,
      },
    );
  });

  it('refreshes tokens and replaces refresh cookie', async () => {
    authService.refresh.mockResolvedValue({
      accessToken: 'new-access-token',

      refreshToken: 'new-refresh-token',
    });

    const response = createReply();

    const result = await controller.refresh(
      createRequest() as never,

      response as never,
    );

    expect(authService.refresh).toHaveBeenCalledWith(
      'refresh-token',

      {
        ipAddress: '127.0.0.1',

        userAgent: 'Vitest',
      },
    );

    expect(response.setCookie).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/auth',
      }),
    );

    expect(result).toEqual({
      accessToken: 'new-access-token',
    });
  });

  it('returns current authenticated user', () => {
    const user = {
      userId: 'user-id',

      sessionId: 'session-id',

      hotelId: null,

      role: 'OWNER',
    };

    expect(controller.me(user as never)).toEqual(user);
  });

  it('logs out current session and clears cookie', async () => {
    authService.logout.mockResolvedValue(undefined);

    const response = createReply();

    await controller.logout(
      createRequest() as never,

      response as never,
    );

    expect(authService.logout).toHaveBeenCalledWith('refresh-token');

    expect(response.clearCookie).toHaveBeenCalledWith(
      'refresh_token',

      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api/auth',
      }),
    );
  });

  it('logs out all sessions and clears cookie', async () => {
    authService.logoutAll.mockResolvedValue(undefined);

    const response = createReply();

    const user = {
      userId: 'user-id',

      sessionId: 'session-id',

      hotelId: null,

      role: 'OWNER',
    };

    await controller.logoutAll(
      user as never,

      response as never,
    );

    expect(authService.logoutAll).toHaveBeenCalledWith('user-id');

    expect(response.clearCookie).toHaveBeenCalledWith(
      'refresh_token',

      expect.objectContaining({
        path: '/api/auth',
      }),
    );
  });
});
