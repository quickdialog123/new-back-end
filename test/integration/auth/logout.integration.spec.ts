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

describe('Auth logout integration', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let prisma: PrismaService;

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

  async function createUser(email: string) {
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: 'Test User',
        role: 'OWNER',
        active: true,
        hotelId: null,
      },
    });
  }

  it('revokes the current session on logout', async () => {
    const user = await createUser('owner@example.com');

    const login = await authService.login(
      {
        email: user.email,
        password,
      },
      {},
    );

    await authService.logout(login.refreshToken);

    const session = await prisma.refreshSession.findFirstOrThrow({
      where: {
        userId: user.id,
      },
    });

    expect(session.revokedAt).toBeInstanceOf(Date);
  });

  it('revokes all active sessions for the user', async () => {
    const user = await createUser('owner@example.com');

    await authService.login(
      {
        email: user.email,
        password,
      },
      {
        userAgent: 'Device A',
      },
    );

    await authService.login(
      {
        email: user.email,
        password,
      },
      {
        userAgent: 'Device B',
      },
    );

    expect(
      await prisma.refreshSession.count({
        where: {
          userId: user.id,
          revokedAt: null,
        },
      }),
    ).toBe(2);

    await authService.logoutAll(user.id);

    expect(
      await prisma.refreshSession.count({
        where: {
          userId: user.id,
          revokedAt: null,
        },
      }),
    ).toBe(0);
  });

  it('does not revoke another users sessions', async () => {
    const firstUser = await createUser('owner@example.com');

    const secondUser = await createUser('staff@example.com');

    await authService.login(
      {
        email: firstUser.email,
        password,
      },
      {},
    );

    await authService.login(
      {
        email: secondUser.email,
        password,
      },
      {},
    );

    await authService.logoutAll(firstUser.id);

    expect(
      await prisma.refreshSession.count({
        where: {
          userId: firstUser.id,
          revokedAt: null,
        },
      }),
    ).toBe(0);

    expect(
      await prisma.refreshSession.count({
        where: {
          userId: secondUser.id,
          revokedAt: null,
        },
      }),
    ).toBe(1);
  });
});
