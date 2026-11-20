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

describe('Guests HTTP integration', () => {
  let moduleRef: TestingModule;
  let app: NestFastifyApplication;
  let authService: AuthService;
  let prisma: PrismaService;
  let hotelId: string;
  let authorization: string;

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
    await prisma.guest.deleteMany();
    await prisma.user.deleteMany();
    await prisma.hotel.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupOwner() {
    const user = await prisma.user.create({
      data: {
        email: 'guest-owner@example.com',
        fullName: 'Guest Owner',
        passwordHash:
          '$2b$12$c3BUQ0eh9XnCZ7YS2VZqbeAODr3TxWz15kgr3ZaPNJpReFKYSYsZO',
        role: 'OWNER',
        hotel: {
          create: {
            name: 'Guest Hotel',
            phoneNumber: '+1 555 000 0000',
            token: 'guest-hotel',
          },
        },
      },
      include: { hotel: true },
    });
    hotelId = user.hotel!.id;
    authorization = `Bearer ${
      (
        await authService.login(
          { email: user.email, password: 'Password123!' },
          {},
        )
      ).accessToken
    }`;
  }

  function headers() {
    return { authorization, origin: 'http://localhost:3000' };
  }

  it('creates, lists, retrieves, updates, and deletes hotel guests', async () => {
    await setupOwner();
    const guestInput = {
      firstName: 'Sam',
      lastName: 'Guest',
      phoneNumber: '+1 555 010 0000',
      address: '42 Example Street',
      checkInDate: '2026-11-19',
      checkOutDate: '2026-11-20',
      roomNumber: 101,
      floorNumber: 1,
    };

    const created = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: headers(),
      payload: guestInput,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      ...guestInput,
      checkInDate: '2026-11-19T00:00:00.000Z',
      checkOutDate: '2026-11-20T00:00:00.000Z',
      hotelId,
    });
    expect(created.json<{ email: string | null }>().email).toBeNull();
    const guestId = created.json<{ id: string }>().id;

    const duplicateContact = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: headers(),
      payload: { ...guestInput, firstName: 'Another' },
    });
    expect(duplicateContact.statusCode).toBe(409);

    const listed = await app.inject({
      method: 'GET',
      url: '/api/guests',
      headers: headers(),
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toHaveLength(1);

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/guests/${guestId}`,
      headers: headers(),
    });
    expect(fetched.statusCode).toBe(200);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/guests/${guestId}`,
      headers: headers(),
      payload: {
        firstName: 'Sam Updated',
        address: '43 Example Street',
        checkInDate: '2026-11-20',
        checkOutDate: '2026-11-21',
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      firstName: 'Sam Updated',
      address: '43 Example Street',
    });

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/guests/${guestId}`,
      headers: headers(),
    });
    expect(deleted.statusCode).toBe(204);
  });

  it('rejects guest creation without required details', async () => {
    await setupOwner();
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: headers(),
      payload: { firstName: 'Incomplete', phoneNumber: '+1 555 010 0000' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('bulk creates guests for the authenticated user’s hotel', async () => {
    await setupOwner();
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests/bulk',
      headers: headers(),
      payload: {
        guests: [
          {
            firstName: 'First',
            lastName: 'Guest',
            email: 'first@example.com',
            phoneNumber: '+1 555 010 0001',
            checkInDate: '2026-11-19',
            checkOutDate: '2026-11-20',
            roomNumber: 101,
            floorNumber: 1,
          },
          {
            firstName: 'Second',
            lastName: 'Guest',
            email: 'second@example.com',
            phoneNumber: '+1 555 010 0002',
            checkInDate: '2026-11-19',
            checkOutDate: '2026-11-20',
            roomNumber: 102,
            floorNumber: 1,
            hotelId: '00000000-0000-4000-8000-000000000000',
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ count: 2 });
    const savedGuests = await prisma.guest.findMany({ where: { hotelId } });
    expect(savedGuests).toHaveLength(2);
    expect(savedGuests.every((guest) => guest.hotelId === hotelId)).toBe(true);
  });

  it('rejects the whole bulk request when any guest is invalid', async () => {
    await setupOwner();
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests/bulk',
      headers: headers(),
      payload: {
        guests: [
          {
            firstName: 'Valid',
            lastName: 'Guest',
            email: 'valid@example.com',
            phoneNumber: '+1 555 010 0001',
            checkInDate: '2026-11-19',
            checkOutDate: '2026-11-20',
            roomNumber: 101,
            floorNumber: 1,
          },
          {
            firstName: 'Invalid',
            lastName: 'Guest',
            email: 'not-an-email',
            phoneNumber: '+1 555 010 0002',
            checkInDate: '2026-11-19',
            checkOutDate: '2026-11-20',
            roomNumber: 102,
            floorNumber: 1,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(await prisma.guest.count({ where: { hotelId } })).toBe(0);
  });

  it('rejects bulk requests larger than 500 guests', async () => {
    await setupOwner();
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests/bulk',
      headers: headers(),
      payload: {
        guests: Array.from({ length: 501 }, (_, index) => ({
          firstName: 'Guest',
          lastName: `${index}`,
          email: `guest-${index}@example.com`,
          phoneNumber: '+1 555 010 0000',
          checkInDate: '2026-11-19',
          checkOutDate: '2026-11-20',
          roomNumber: 100 + index,
          floorNumber: 1,
        })),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(await prisma.guest.count({ where: { hotelId } })).toBe(0);
  });

  it('bulk deletes only matching guests from the authenticated user’s hotel', async () => {
    await setupOwner();
    const ownGuest = await prisma.guest.create({
      data: {
        hotelId,
        firstName: 'Own',
        lastName: 'Guest',
        email: 'own@example.com',
        phoneNumber: '+1 555 010 0001',
        checkInDate: new Date('2026-11-19T00:00:00.000Z'),
        checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
        roomNumber: 101,
        floorNumber: 1,
      },
    });
    const otherHotel = await prisma.hotel.create({
      data: {
        name: 'Other Hotel',
        phoneNumber: '+1 555 000 0001',
        token: 'other-hotel-bulk-delete',
      },
    });
    const otherGuest = await prisma.guest.create({
      data: {
        hotelId: otherHotel.id,
        firstName: 'Other',
        lastName: 'Guest',
        email: 'other@example.com',
        phoneNumber: '+1 555 010 0002',
        checkInDate: new Date('2026-11-19T00:00:00.000Z'),
        checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
        roomNumber: 102,
        floorNumber: 1,
      },
    });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/guests/bulk',
      headers: headers(),
      payload: { ids: [ownGuest.id, otherGuest.id] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ count: 1 });
    expect(
      await prisma.guest.findUnique({ where: { id: ownGuest.id } }),
    ).toBeNull();
    expect(
      await prisma.guest.findUnique({ where: { id: otherGuest.id } }),
    ).not.toBeNull();
  });

  it('does not expose a guest to a different hotel', async () => {
    await setupOwner();
    const guest = await prisma.guest.create({
      data: {
        hotelId,
        firstName: 'Private',
        lastName: 'Guest',
        email: 'private@example.com',
        phoneNumber: '+1 555 010 0000',
        checkInDate: new Date('2026-11-19T00:00:00.000Z'),
        checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
        roomNumber: 101,
        floorNumber: 1,
      },
    });

    const otherUser = await prisma.user.create({
      data: {
        email: 'other-owner@example.com',
        fullName: 'Other Owner',
        passwordHash:
          '$2b$12$c3BUQ0eh9XnCZ7YS2VZqbeAODr3TxWz15kgr3ZaPNJpReFKYSYsZO',
        role: 'OWNER',
        hotel: {
          create: {
            name: 'Other Hotel',
            phoneNumber: '+1 555 000 0001',
            token: 'other-hotel',
          },
        },
      },
    });
    const otherAuthorization = `Bearer ${
      (
        await authService.login(
          { email: otherUser.email, password: 'Password123!' },
          {},
        )
      ).accessToken
    }`;

    const response = await app.inject({
      method: 'GET',
      url: `/api/guests/${guest.id}`,
      headers: {
        authorization: otherAuthorization,
        origin: 'http://localhost:3000',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
