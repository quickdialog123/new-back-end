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

type HotelResponse = {
  id: string;
  name: string;
  phoneNumber: string;
  active: boolean;
  owner?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
};

const hotelInput = {
  name: 'Grand Hotel',
  phoneNumber: '+1 555 123 4567',
  token: 'grand-hotel',
  owner: {
    email: 'owner@example.com',
    fullName: 'Hotel Owner',
    password: 'Password123!',
  },
};

describe('Hotels HTTP integration', () => {
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
    // User.hotelId has an on-delete restriction, so dependent rows go first.
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.hotel.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function authorizationFor(role: 'SUPER_ADMIN' | 'OWNER') {
    const user = await prisma.user.create({
      data:
        role === 'SUPER_ADMIN'
          ? {
              email: 'admin@example.com',
              fullName: 'Super Admin',
              passwordHash:
                '$2b$12$c3BUQ0eh9XnCZ7YS2VZqbeAODr3TxWz15kgr3ZaPNJpReFKYSYsZO',
              role,
            }
          : {
              email: 'owner-auth@example.com',
              fullName: 'Hotel Owner',
              passwordHash:
                '$2b$12$c3BUQ0eh9XnCZ7YS2VZqbeAODr3TxWz15kgr3ZaPNJpReFKYSYsZO',
              role,
              hotel: {
                create: {
                  name: 'Authorization Hotel',
                  phoneNumber: '+1 555 000 0000',
                  token: 'authorization-hotel',
                },
              },
            },
    });

    const { accessToken } = await authService.login(
      { email: user.email, password: 'Password123!' },
      {},
    );

    return `Bearer ${accessToken}`;
  }

  function expectSafeHotelResponse(response: HotelResponse | HotelResponse[]) {
    const hotels = Array.isArray(response) ? response : [response];

    for (const hotel of hotels) {
      expect(hotel).not.toHaveProperty('token');
      expect(JSON.stringify(hotel)).not.toContain('passwordHash');
    }
  }

  it('returns 401 when a hotel endpoint is unauthenticated', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/hotels',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 when a non-super-admin accesses a hotel endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/hotels',
      headers: {
        authorization: await authorizationFor('OWNER'),
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('allows a super admin to create, list, get, update, and deactivate hotels without exposing secrets', async () => {
    const authorization = await authorizationFor('SUPER_ADMIN');

    const created = await app.inject({
      method: 'POST',
      url: '/api/hotels',
      headers: { authorization },
      payload: hotelInput,
    });

    expect(created.statusCode).toBe(201);
    const createdHotel = created.json<HotelResponse>();
    expect(createdHotel).toMatchObject({
      name: hotelInput.name,
      phoneNumber: hotelInput.phoneNumber,
      active: true,
      owner: {
        email: hotelInput.owner.email,
        fullName: hotelInput.owner.fullName,
        role: 'OWNER',
      },
    });
    expectSafeHotelResponse(createdHotel);

    const listed = await app.inject({
      method: 'GET',
      url: '/api/hotels',
      headers: { authorization },
    });

    expect(listed.statusCode).toBe(200);
    const hotels = listed.json<HotelResponse[]>();
    expect(hotels).toHaveLength(1);
    expect(hotels[0]).toMatchObject({ id: createdHotel.id });
    expectSafeHotelResponse(hotels);

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/hotels/${createdHotel.id}`,
      headers: { authorization },
    });

    expect(fetched.statusCode).toBe(200);
    expectSafeHotelResponse(fetched.json<HotelResponse>());

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/hotels/${createdHotel.id}`,
      headers: { authorization },
      payload: { name: 'Renamed Grand Hotel' },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json<HotelResponse>()).toMatchObject({
      id: createdHotel.id,
      name: 'Renamed Grand Hotel',
    });
    expectSafeHotelResponse(updated.json<HotelResponse>());

    const deactivated = await app.inject({
      method: 'POST',
      url: `/api/hotels/${createdHotel.id}/deactivate`,
      headers: { authorization },
    });

    expect(deactivated.statusCode).toBe(200);
    expect(deactivated.json<HotelResponse>()).toMatchObject({
      id: createdHotel.id,
      active: false,
    });
    expectSafeHotelResponse(deactivated.json<HotelResponse>());

    expect(
      await prisma.user.count({
        where: { hotelId: createdHotel.id, active: true },
      }),
    ).toBe(0);
  });

  it('returns 400 for invalid request bodies and hotel identifiers', async () => {
    const authorization = await authorizationFor('SUPER_ADMIN');

    const invalidBody = await app.inject({
      method: 'POST',
      url: '/api/hotels',
      headers: { authorization },
      payload: { name: '' },
    });
    const invalidId = await app.inject({
      method: 'GET',
      url: '/api/hotels/not-a-uuid',
      headers: { authorization },
    });

    expect(invalidBody.statusCode).toBe(400);
    expect(invalidId.statusCode).toBe(400);
  });

  it('returns 409 for duplicate hotel tokens and owner email addresses', async () => {
    const authorization = await authorizationFor('SUPER_ADMIN');

    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/hotels',
          headers: { authorization },
          payload: hotelInput,
        })
      ).statusCode,
    ).toBe(201);

    const duplicateToken = await app.inject({
      method: 'POST',
      url: '/api/hotels',
      headers: { authorization },
      payload: {
        ...hotelInput,
        owner: { ...hotelInput.owner, email: 'different-owner@example.com' },
      },
    });
    const duplicateOwner = await app.inject({
      method: 'POST',
      url: '/api/hotels',
      headers: { authorization },
      payload: {
        ...hotelInput,
        token: 'different-hotel-token',
      },
    });

    expect(duplicateToken.statusCode).toBe(409);
    expect(duplicateOwner.statusCode).toBe(409);
    expect(duplicateToken.json()).toMatchObject({
      message: 'A record with this value already exists',
    });
    expect(duplicateOwner.json()).toMatchObject({
      message: 'A record with this value already exists',
    });
  });

  it('returns 404 when a super admin requests a missing hotel', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/hotels/5e4e8c68-31e1-4f35-a930-b5a5ba9d6b67',
      headers: {
        authorization: await authorizationFor('SUPER_ADMIN'),
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('maps Prisma missing-record errors from hotel updates to 404', async () => {
    const id = '5e4e8c68-31e1-4f35-a930-b5a5ba9d6b67';
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/hotels/${id}`,
      headers: {
        authorization: await authorizationFor('SUPER_ADMIN'),
      },
      payload: { name: 'Missing Hotel' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Record not found',
      path: `/api/hotels/${id}`,
    });
  });
});
