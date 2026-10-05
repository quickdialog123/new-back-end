import bcrypt from 'bcryptjs';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AuthModule } from '@quickdialog/auth/auth.module.js';
import { AuthService } from '@quickdialog/auth/auth.service.js';
import configuration from '@quickdialog/config/configuration.js';
import { validateEnvironment } from '@quickdialog/config/env.schema.js';
import { DatabaseModule } from '@quickdialog/database/database.module.js';
import { PrismaService } from '@quickdialog/database/prisma.service.js';

describe('Auth refresh integration', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let prisma: PrismaService;

  const email = 'owner@example.com';
  const password = 'Password123!';

  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 12);

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: validateEnvironment,
        }),

        DatabaseModule,
        AuthModule,
      ],
    }).compile();

    await moduleRef.init();

    authService = moduleRef.get(AuthService);

    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function createUser() {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'Test Owner',
        role: 'OWNER',
        active: true,
        hotelId: null,
      },
    });
  }

  async function login() {
    const user = await createUser();

    const tokens = await authService.login(
      {
        email,
        password,
      },
      {},
    );

    return {
      user,
      tokens,
    };
  }

  it('rotates the refresh token and creates a replacement session', async () => {
    const { user, tokens } = await login();

    const firstSession = await prisma.refreshSession.findFirstOrThrow({
      where: {
        userId: user.id,
      },
    });

    const refreshed = await authService.refresh(tokens.refreshToken, {
      ipAddress: '127.0.0.2',
      userAgent: 'Refresh Integration',
    });

    expect(refreshed.refreshToken).not.toBe(tokens.refreshToken);

    const sessions = await prisma.refreshSession.findMany({
      where: {
        userId: user.id,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(sessions).toHaveLength(2);

    const oldSession = sessions.find(
      (session) => session.id === firstSession.id,
    );

    const replacement = sessions.find(
      (session) => session.id !== firstSession.id,
    );

    expect(oldSession).toBeDefined();

    expect(replacement).toBeDefined();

    expect(oldSession?.revokedAt).toBeInstanceOf(Date);

    expect(oldSession?.lastUsedAt).toBeInstanceOf(Date);

    expect(oldSession?.replacedById).toBe(replacement?.id);

    expect(replacement?.revokedAt).toBeNull();

    expect(replacement?.familyId).toBe(firstSession.familyId);

    expect(replacement?.absoluteExpiresAt.getTime()).toBe(
      firstSession.absoluteExpiresAt.getTime(),
    );

    expect(replacement?.tokenHash).not.toBe(firstSession.tokenHash);

    expect(replacement?.ipAddress).toBe('127.0.0.2');

    expect(replacement?.userAgent).toBe('Refresh Integration');
  });

  it('revokes the whole family when an old rotated token is reused', async () => {
    const { user, tokens } = await login();

    const firstSession = await prisma.refreshSession.findFirstOrThrow({
      where: {
        userId: user.id,
      },
    });

    await authService.refresh(tokens.refreshToken, {});

    await expect(
      authService.refresh(tokens.refreshToken, {}),
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
    });

    const activeSessions = await prisma.refreshSession.count({
      where: {
        familyId: firstSession.familyId,

        revokedAt: null,
      },
    });

    expect(activeSessions).toBe(0);
  });

  it('rejects an expired refresh token', async () => {
    const { user, tokens } = await login();

    await prisma.refreshSession.updateMany({
      where: {
        userId: user.id,
      },

      data: {
        expiresAt: new Date(Date.now() - 1_000),
      },
    });

    await expect(
      authService.refresh(tokens.refreshToken, {}),
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
    });
  });

  it('revokes the family when absolute session lifetime is expired', async () => {
    const { user, tokens } = await login();

    const session = await prisma.refreshSession.findFirstOrThrow({
      where: {
        userId: user.id,
      },
    });

    await prisma.refreshSession.update({
      where: {
        id: session.id,
      },

      data: {
        absoluteExpiresAt: new Date(Date.now() - 1_000),
      },
    });

    await expect(
      authService.refresh(tokens.refreshToken, {}),
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
    });

    expect(
      await prisma.refreshSession.count({
        where: {
          familyId: session.familyId,

          revokedAt: null,
        },
      }),
    ).toBe(0);
  });

  it('revokes the family when the user becomes inactive', async () => {
    const { user, tokens } = await login();

    const session = await prisma.refreshSession.findFirstOrThrow({
      where: {
        userId: user.id,
      },
    });

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        active: false,
      },
    });

    await expect(
      authService.refresh(tokens.refreshToken, {}),
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
    });

    expect(
      await prisma.refreshSession.count({
        where: {
          familyId: session.familyId,

          revokedAt: null,
        },
      }),
    ).toBe(0);
  });
});
