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

describe('Auth login integration', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let prisma: PrismaService;

  const email = 'owner@example.com';
  const password = 'Password123!';

  beforeAll(async () => {
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
        passwordHash: await bcrypt.hash(password, 12),
        fullName: 'Test Owner',
        role: 'OWNER',
        active: true,
        hotelId: null,
      },
    });
  }

  it('creates a real refresh session when login succeeds', async () => {
    const user = await createUser();

    const result = await authService.login(
      {
        email,
        password,
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest Integration',
      },
    );

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');

    const session = await prisma.refreshSession.findFirstOrThrow({
      where: {
        userId: user.id,
      },
    });

    expect(session.revokedAt).toBeNull();
    expect(session.familyId).toBeTruthy();
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.absoluteExpiresAt).toBeInstanceOf(Date);

    expect(session.tokenHash).not.toBe(result.refreshToken);
    expect(session.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    expect(session.ipAddress).toBe('127.0.0.1');
    expect(session.userAgent).toBe('Vitest Integration');
  });

  it('updates lastLoginAt', async () => {
    const user = await createUser();

    expect(user.lastLoginAt).toBeNull();

    await authService.login(
      {
        email,
        password,
      },
      {},
    );

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: {
        id: user.id,
      },
    });

    expect(updatedUser.lastLoginAt).toBeInstanceOf(Date);
  });

  it('does not create a session for invalid credentials', async () => {
    await createUser();

    await expect(
      authService.login(
        {
          email,
          password: 'wrong-password',
        },
        {},
      ),
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
    });

    expect(await prisma.refreshSession.count()).toBe(0);
  });
});
