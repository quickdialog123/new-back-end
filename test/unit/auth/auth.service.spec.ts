import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '@quickdialog/auth/auth.service.js';
import { PrismaService } from '@quickdialog/database/prisma.service.js';

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

const user = {
  id: '4e3ee6a0-eec9-47c8-9fe3-e92afe8a2b1b',
  email: 'owner@example.com',
  passwordHash: 'hashed-password',
  fullName: 'Owner',
  role: 'OWNER' as const,
  hotelId: null,
  active: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const metadata = {
  ipAddress: '127.0.0.1',
  userAgent: 'Vitest',
};

describe('AuthService', () => {
  let service: AuthService;

  const userFindUnique = vi.fn();
  const userUpdate = vi.fn();

  const sessionFindUnique = vi.fn();
  const sessionCreate = vi.fn();
  const sessionUpdateMany = vi.fn();

  const signAsync = vi.fn();

  const transactionClient = {
    user: {
      update: userUpdate,
    },

    refreshSession: {
      create: sessionCreate,
      updateMany: sessionUpdateMany,
    },
  };

  const prisma = {
    user: {
      findUnique: userFindUnique,
    },

    refreshSession: {
      findUnique: sessionFindUnique,
      updateMany: sessionUpdateMany,
    },

    $transaction: vi.fn(
      async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    ),
  };

  const configService = {
    getOrThrow: vi.fn((key: string) => {
      const values: Record<string, string> = {
        'auth.refreshToken.ttl': '7d',
        'auth.session.maxTtl': '30d',
      };

      return values[key];
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    signAsync.mockResolvedValue('access-token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync,
          },
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('returns access and refresh tokens for valid credentials', async () => {
      userFindUnique.mockResolvedValue(user);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      sessionCreate.mockResolvedValue({
        id: '8d234fad-ceec-4f64-bb1b-1459c0b16cd7',
      });

      const result = await service.login(
        {
          email: user.email,
          password: 'Password123!',
        },
        metadata,
      );

      expect(result.accessToken).toBe('access-token');

      expect(result.refreshToken).toBeTypeOf('string');

      expect(userFindUnique).toHaveBeenCalledWith({
        where: {
          email: user.email,
        },
      });

      expect(userUpdate).toHaveBeenCalledWith({
        where: {
          id: user.id,
        },

        data: {
          lastLoginAt: expect.any(Date),
        },
      });

      expect(sessionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,

          tokenHash: expect.any(String),

          expiresAt: expect.any(Date),

          absoluteExpiresAt: expect.any(Date),

          ipAddress: metadata.ipAddress,

          userAgent: metadata.userAgent,
        }),
      });

      expect(sessionCreate.mock.calls[0][0].data.tokenHash).not.toBe(
        result.refreshToken,
      );

      expect(signAsync).toHaveBeenCalledWith({
        sub: user.id,

        sid: '8d234fad-ceec-4f64-bb1b-1459c0b16cd7',

        hotelId: null,

        role: 'OWNER',
      });
    });

    it('rejects an unknown user', async () => {
      userFindUnique.mockResolvedValue(null);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login(
          {
            email: 'missing@example.com',
            password: 'Password123!',
          },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionCreate).not.toHaveBeenCalled();
      expect(signAsync).not.toHaveBeenCalled();
    });

    it('rejects an invalid password', async () => {
      userFindUnique.mockResolvedValue(user);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.login(
          {
            email: user.email,
            password: 'wrong-password',
          },
          metadata,
        ),
      ).rejects.toMatchObject({
        message: 'Invalid email or password',
      });
    });

    it('rejects an inactive user', async () => {
      userFindUnique.mockResolvedValue({
        ...user,
        active: false,
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        service.login(
          {
            email: user.email,
            password: 'Password123!',
          },
          metadata,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const currentSession = {
      id: '8d234fad-ceec-4f64-bb1b-1459c0b16cd7',

      familyId: 'c5497c67-4e65-4644-bbb9-e9fb40f76627',

      userId: user.id,

      expiresAt: new Date(Date.now() + 60_000),

      absoluteExpiresAt: new Date(Date.now() + 86_400_000),

      revokedAt: null,

      user,
    };

    it('rejects a missing refresh token', async () => {
      await expect(service.refresh(undefined, metadata)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an unknown refresh token', async () => {
      sessionFindUnique.mockResolvedValue(null);

      await expect(
        service.refresh('unknown-token', metadata),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rotates a valid refresh token', async () => {
      sessionFindUnique.mockResolvedValue(currentSession);

      sessionUpdateMany.mockResolvedValue({
        count: 1,
      });

      sessionCreate.mockResolvedValue({
        id: '4c3e4a83-6877-40e5-b1a0-e861d0fc2f12',
      });

      const result = await service.refresh('current-refresh-token', metadata);

      expect(result.accessToken).toBe('access-token');

      expect(result.refreshToken).toBeTypeOf('string');

      expect(sessionUpdateMany).toHaveBeenCalledWith({
        where: {
          id: currentSession.id,

          revokedAt: null,

          expiresAt: {
            gt: expect.any(Date),
          },

          absoluteExpiresAt: {
            gt: expect.any(Date),
          },
        },

        data: {
          revokedAt: expect.any(Date),

          lastUsedAt: expect.any(Date),

          replacedById: expect.any(String),
        },
      });

      expect(sessionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: currentSession.familyId,

          userId: currentSession.userId,

          tokenHash: expect.any(String),

          expiresAt: expect.any(Date),

          absoluteExpiresAt: currentSession.absoluteExpiresAt,

          ipAddress: metadata.ipAddress,

          userAgent: metadata.userAgent,
        }),
      });
    });

    it('revokes the family when a revoked token is reused', async () => {
      sessionFindUnique.mockResolvedValue({
        ...currentSession,
        revokedAt: new Date(),
      });

      sessionUpdateMany.mockResolvedValue({
        count: 1,
      });

      await expect(
        service.refresh('reused-token', metadata),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionUpdateMany).toHaveBeenCalledWith({
        where: {
          familyId: currentSession.familyId,
          revokedAt: null,
        },

        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('rejects an expired refresh token', async () => {
      sessionFindUnique.mockResolvedValue({
        ...currentSession,
        expiresAt: new Date(Date.now() - 1_000),
      });

      await expect(
        service.refresh('expired-token', metadata),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('revokes the family when absolute session lifetime expired', async () => {
      sessionFindUnique.mockResolvedValue({
        ...currentSession,

        absoluteExpiresAt: new Date(Date.now() - 1_000),
      });

      sessionUpdateMany.mockResolvedValue({
        count: 1,
      });

      await expect(
        service.refresh('expired-session-token', metadata),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionUpdateMany).toHaveBeenCalledWith({
        where: {
          familyId: currentSession.familyId,
          revokedAt: null,
        },

        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('revokes the family when user is inactive', async () => {
      sessionFindUnique.mockResolvedValue({
        ...currentSession,

        user: {
          ...user,
          active: false,
        },
      });

      sessionUpdateMany.mockResolvedValue({
        count: 1,
      });

      await expect(
        service.refresh('inactive-user-token', metadata),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionUpdateMany).toHaveBeenCalledWith({
        where: {
          familyId: currentSession.familyId,
          revokedAt: null,
        },

        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('revokes the family when refresh token was already consumed concurrently', async () => {
      sessionFindUnique.mockResolvedValue(currentSession);

      sessionUpdateMany
        .mockResolvedValueOnce({
          count: 0,
        })
        .mockResolvedValueOnce({
          count: 1,
        });

      await expect(
        service.refresh('race-token', metadata),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(sessionCreate).not.toHaveBeenCalled();

      expect(sessionUpdateMany).toHaveBeenLastCalledWith({
        where: {
          familyId: currentSession.familyId,
          revokedAt: null,
        },

        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('logout', () => {
    it('does nothing if refresh token is missing', async () => {
      await service.logout(undefined);

      expect(sessionUpdateMany).not.toHaveBeenCalled();
    });

    it('revokes the active refresh session', async () => {
      sessionUpdateMany.mockResolvedValue({
        count: 1,
      });

      await service.logout('refresh-token');

      expect(sessionUpdateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: expect.any(String),

          revokedAt: null,
        },

        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('logoutAll', () => {
    it('revokes all active sessions for a user', async () => {
      sessionUpdateMany.mockResolvedValue({
        count: 2,
      });

      await service.logoutAll(user.id);

      expect(sessionUpdateMany).toHaveBeenCalledWith({
        where: {
          userId: user.id,

          revokedAt: null,
        },

        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });
});
