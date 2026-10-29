import bcrypt from 'bcryptjs';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '@quickdialog/app.module.js';
import { AuthService } from '@quickdialog/auth/auth.service.js';
import { createValidationException } from '@quickdialog/common/errors/validation-exception.factory.js';
import { PrismaService } from '@quickdialog/database/prisma.service.js';

const notConnectedStatus = {
  status: 'not_connected',
  wabaId: null,
  phoneNumber: null,
  displayName: null,
  wabaStatus: null,
  qualityRating: null,
  connectedAt: null,
  errorMessage: null,
};

describe('WhatsApp HTTP integration', () => {
  let moduleRef: TestingModule;
  let app: NestFastifyApplication;
  let authService: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    const config = app.get(ConfigService);
    app.setGlobalPrefix(config.getOrThrow<string>('app.prefix'));
    app.useGlobalPipes(
      new StandardSchemaValidationPipe({
        exceptionFactory: createValidationException,
      }),
    );
    await app.init();

    authService = app.get(AuthService);
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.whatsAppAccount.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.hotel.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createOwnerAuthorization() {
    const user = await prisma.user.create({
      data: {
        email: 'owner-whatsapp@example.com',
        fullName: 'WhatsApp Owner',
        passwordHash: await bcrypt.hash('Password123!', 12),
        role: 'OWNER',
        hotel: {
          create: {
            name: 'WhatsApp Hotel',
            phoneNumber: '+15550000000',
            token: 'whatsapp-hotel',
          },
        },
      },
    });
    const { accessToken } = await authService.login(
      { email: user.email, password: 'Password123!' },
      {},
    );

    return { hotelId: user.hotelId!, authorization: `Bearer ${accessToken}` };
  }

  function headers(authorization: string) {
    return {
      authorization,
      origin: 'http://localhost:3000',
    };
  }

  it('returns not_connected when the owner has no WhatsApp account', async () => {
    const { authorization } = await createOwnerAuthorization();

    const response = await app.inject({
      method: 'GET',
      url: '/api/whatsapp/status',
      headers: headers(authorization),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(notConnectedStatus);
  });

  it('returns the connected account status without exposing its token', async () => {
    const { hotelId, authorization } = await createOwnerAuthorization();
    const connectedAt = new Date('2026-10-28T12:00:00.000Z');
    await prisma.whatsAppAccount.create({
      data: {
        hotelId,
        wabaId: 'waba-id',
        businessId: 'business-id',
        phoneNumberId: 'phone-id',
        displayPhoneNumber: '+15551234567',
        verifiedName: 'QuickDialog Hotel',
        accessTokenEncrypted: 'encrypted-token',
        status: 'CONNECTED',
        connectedAt,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/whatsapp/status',
      headers: headers(authorization),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'connected',
      wabaId: 'waba-id',
      phoneNumber: '+15551234567',
      displayName: 'QuickDialog Hotel',
      wabaStatus: null,
      qualityRating: null,
      connectedAt: connectedAt.toISOString(),
      errorMessage: null,
    });
    expect(response.body).not.toContain('encrypted-token');
  });

  it('disconnects an account without deleting its persisted metadata', async () => {
    const { hotelId, authorization } = await createOwnerAuthorization();
    const account = await prisma.whatsAppAccount.create({
      data: {
        hotelId,
        wabaId: 'waba-id',
        businessId: 'business-id',
        phoneNumberId: 'phone-id',
        displayPhoneNumber: '+15551234567',
        verifiedName: 'QuickDialog Hotel',
        accessTokenEncrypted: 'encrypted-token',
        status: 'CONNECTED',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/whatsapp/disconnect',
      headers: headers(authorization),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual(notConnectedStatus);
    await expect(
      prisma.whatsAppAccount.findUniqueOrThrow({ where: { id: account.id } }),
    ).resolves.toMatchObject({
      wabaId: 'waba-id',
      businessId: 'business-id',
      phoneNumberId: 'phone-id',
      displayPhoneNumber: '+15551234567',
      verifiedName: 'QuickDialog Hotel',
      status: 'DISCONNECTED',
      accessTokenEncrypted: null,
    });
  });
});
