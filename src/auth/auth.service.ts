import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import type { User } from '@quickdialog/generated/prisma/client.js';
import {
  durationToMs,
  generateRefreshToken,
  hashRefreshToken,
} from './auth.utils.js';
import type { JwtPayload } from './schemas/jwt-payload.schema.js';
import type { LoginDTO } from './schemas/login.schema.js';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

const DUMMY_PASSWORD_HASH =
  '$2b$12$c3BUQ0eh9XnCZ7YS2VZqbeAODr3TxWz15kgr3ZaPNJpReFKYSYsZO';

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginDTO, metadata: RequestMetadata): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: input.email,
      },
    });

    const passwordValid = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordValid || !user.active) {
      throw this.invalidCredentials();
    }

    const now = new Date();

    const refreshToken = generateRefreshToken();

    const absoluteExpiresAt = this.sessionAbsoluteExpiresAt(now);

    const refreshSession = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },

        data: {
          lastLoginAt: now,
        },
      });

      return tx.refreshSession.create({
        data: {
          userId: user.id,

          tokenHash: hashRefreshToken(refreshToken),

          expiresAt: this.refreshTokenExpiresAt(now),

          absoluteExpiresAt,

          ...metadata,
        },
      });
    });

    return {
      accessToken: await this.issueAccessToken(user, refreshSession.id),

      refreshToken,
    };
  }

  async refresh(
    refreshToken: string | undefined,
    metadata: RequestMetadata,
  ): Promise<AuthTokens> {
    if (!refreshToken) {
      throw this.invalidCredentials();
    }

    const now = new Date();

    const currentSession = await this.prisma.refreshSession.findUnique({
      where: {
        tokenHash: hashRefreshToken(refreshToken),
      },

      include: {
        user: true,
      },
    });

    if (!currentSession) {
      throw this.invalidCredentials();
    }

    /**
     * A previously consumed token is being reused.
     * Revoke the whole login family.
     */
    if (currentSession.revokedAt) {
      await this.revokeFamily(currentSession.familyId);

      throw this.invalidCredentials();
    }

    /**
     * Refresh token naturally expired.
     */
    if (currentSession.expiresAt <= now) {
      throw this.invalidCredentials();
    }

    /**
     * Whole login session reached its
     * absolute maximum lifetime.
     */
    if (currentSession.absoluteExpiresAt <= now) {
      await this.revokeFamily(currentSession.familyId);

      throw this.invalidCredentials();
    }

    /**
     * Disabled users cannot continue
     * refreshing existing sessions.
     */
    if (!currentSession.user.active) {
      await this.revokeFamily(currentSession.familyId);

      throw this.invalidCredentials();
    }

    const nextRefreshToken = generateRefreshToken();

    const replacementSessionId = randomUUID();

    const replacementSession = await this.prisma.$transaction(async (tx) => {
      /**
       * Atomically consume the current
       * refresh token exactly once.
       */
      const consumed = await tx.refreshSession.updateMany({
        where: {
          id: currentSession.id,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
          absoluteExpiresAt: {
            gt: now,
          },
        },

        data: {
          revokedAt: now,
          lastUsedAt: now,
          replacedById: replacementSessionId,
        },
      });

      if (consumed.count !== 1) {
        return null;
      }

      return tx.refreshSession.create({
        data: {
          id: replacementSessionId,

          familyId: currentSession.familyId,

          userId: currentSession.userId,

          tokenHash: hashRefreshToken(nextRefreshToken),

          expiresAt: this.refreshTokenExpiresAt(now),

          absoluteExpiresAt: currentSession.absoluteExpiresAt,

          ...metadata,
        },
      });
    });

    if (!replacementSession) {
      await this.revokeFamily(currentSession.familyId);

      throw this.invalidCredentials();
    }

    return {
      accessToken: await this.issueAccessToken(
        currentSession.user,
        replacementSession.id,
      ),

      refreshToken: nextRefreshToken,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prisma.refreshSession.updateMany({
      where: {
        tokenHash: hashRefreshToken(refreshToken),

        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });
  }

  private async issueAccessToken(
    user: User,
    sessionId: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      sid: sessionId,
      hotelId: user.hotelId,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  private refreshTokenExpiresAt(from = new Date()): Date {
    const ttl = this.config.getOrThrow<string>('auth.refreshToken.ttl');

    return new Date(from.getTime() + durationToMs(ttl));
  }

  private sessionAbsoluteExpiresAt(from = new Date()): Date {
    const ttl = this.config.getOrThrow<string>('auth.session.maxTtl');

    return new Date(from.getTime() + durationToMs(ttl));
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
  }
}
