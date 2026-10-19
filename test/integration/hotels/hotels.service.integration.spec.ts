import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ConfigModule } from '@nestjs/config';
import configuration from '@quickdialog/config/configuration.js';
import { validateEnvironment } from '@quickdialog/config/env.schema.js';
import { DatabaseModule } from '@quickdialog/database/database.module.js';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { HotelModule } from '@quickdialog/hotels/hotels.module.js';
import { HotelsService } from '@quickdialog/hotels/hotels.service.js';

describe('HotelsService integration', () => {
  let moduleRef: TestingModule;
  let hotelsService: HotelsService;
  let prisma: PrismaService;

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

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: validateEnvironment,
        }),
        DatabaseModule,
        HotelModule,
      ],
    }).compile();
    await moduleRef.init();
    hotelsService = moduleRef.get(HotelsService);
    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.hotel.deleteMany();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('atomically creates a hotel and initial owner without returning secrets', async () => {
    const result = await hotelsService.create(hotelInput);

    expect(result).not.toHaveProperty('token');
    expect(result.owner).not.toHaveProperty('passwordHash');
    expect(await prisma.hotel.count({ where: { id: result.id } })).toBe(1);
    expect(
      await prisma.user.count({ where: { email: hotelInput.owner.email } }),
    ).toBe(1);
    expect(
      (
        await prisma.user.findUniqueOrThrow({
          where: { email: hotelInput.owner.email },
        })
      ).hotelId,
    ).toBe(result.id);
  });

  it('rolls back the hotel when the initial owner email conflicts', async () => {
    await prisma.hotel.create({
      data: {
        name: 'Existing Hotel',
        phoneNumber: '+1 555 765 4321',
        token: 'existing-hotel',
        users: {
          create: {
            email: hotelInput.owner.email,
            fullName: 'Existing User',
            passwordHash: 'existing-hash',
            role: 'OWNER',
          },
        },
      },
    });

    await expect(hotelsService.create(hotelInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(await prisma.hotel.count()).toBe(1);
  });

  it('deactivates hotel users and their active refresh sessions atomically', async () => {
    const hotel = await hotelsService.create(hotelInput);
    const staff = await prisma.user.create({
      data: {
        email: 'staff@example.com',
        fullName: 'Hotel Staff',
        passwordHash: 'hash',
        role: 'STAFF',
        hotelId: hotel.id,
      },
    });
    const unrelatedUser = await prisma.user.create({
      data: {
        email: 'unrelated@example.com',
        fullName: 'Unrelated User',
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
      },
    });
    const expiresAt = new Date(Date.now() + 60_000);
    const absoluteExpiresAt = new Date(Date.now() + 86_400_000);

    await prisma.refreshSession.createMany({
      data: [
        {
          userId: staff.id,
          tokenHash: 'a'.repeat(64),
          expiresAt,
          absoluteExpiresAt,
        },
        {
          userId: unrelatedUser.id,
          tokenHash: 'b'.repeat(64),
          expiresAt,
          absoluteExpiresAt,
        },
      ],
    });

    const result = await hotelsService.deactivate(hotel.id);
    await hotelsService.deactivate(hotel.id);

    expect(result).not.toHaveProperty('token');
    expect(result.active).toBe(false);
    expect(
      await prisma.user.count({ where: { hotelId: hotel.id, active: true } }),
    ).toBe(0);
    expect(
      await prisma.refreshSession.count({
        where: { user: { hotelId: hotel.id }, revokedAt: null },
      }),
    ).toBe(0);
    expect(
      await prisma.refreshSession.count({
        where: { userId: unrelatedUser.id, revokedAt: null },
      }),
    ).toBe(1);
  });
});
