import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { HotelsService } from '@quickdialog/hotels/hotels.service.js';

vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }));

describe('HotelsService', () => {
  let service: HotelsService;
  const hotelCreate = vi.fn();
  const hotelFindMany = vi.fn();
  const hotelFindUnique = vi.fn();
  const hotelUpdate = vi.fn();
  const transactionClient = {
    hotel: { create: hotelCreate, update: hotelUpdate },
    user: { updateMany: vi.fn() },
    refreshSession: { updateMany: vi.fn() },
  };
  const prisma = {
    hotel: {
      findMany: hotelFindMany,
      findUnique: hotelFindUnique,
      update: hotelUpdate,
    },
    $transaction: vi.fn((callback) => callback(transactionClient)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);

    const moduleRef = await Test.createTestingModule({
      providers: [HotelsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(HotelsService);
  });

  const input = {
    name: 'Grand Hotel',
    phoneNumber: '+1 555 123 4567',
    token: 'hotel-token',
    owner: {
      email: 'owner@example.com',
      fullName: 'Hotel Owner',
      password: 'Password123!',
    },
  };

  it('creates the hotel and owner in one transaction without exposing secrets', async () => {
    hotelCreate.mockResolvedValue({
      id: 'hotel-id',
      name: input.name,
      phoneNumber: input.phoneNumber,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      users: [
        {
          id: 'owner-id',
          email: input.owner.email,
          fullName: input.owner.fullName,
          role: 'OWNER',
        },
      ],
    });

    const result = await service.create(input);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(bcrypt.hash).toHaveBeenCalledWith(input.owner.password, 12);
    expect(hotelCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          users: {
            create: expect.objectContaining({
              role: 'OWNER',
              passwordHash: 'hashed-password',
            }),
          },
        }),
      }),
    );
    expect(result).not.toHaveProperty('token');
    expect(result.owner).not.toHaveProperty('passwordHash');
  });

  it('throws when a hotel cannot be found', async () => {
    hotelFindUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deactivates the hotel, its users, and their active refresh sessions atomically', async () => {
    hotelUpdate.mockResolvedValue({
      id: 'hotel-id',
      name: input.name,
      phoneNumber: input.phoneNumber,
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.deactivate('hotel-id');

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(hotelUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'hotel-id' },
        data: { active: false },
      }),
    );
    expect(transactionClient.user.updateMany).toHaveBeenCalledWith({
      where: { hotelId: 'hotel-id' },
      data: { active: false },
    });
    expect(transactionClient.refreshSession.updateMany).toHaveBeenCalledWith({
      where: {
        user: { hotelId: 'hotel-id' },
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(result).not.toHaveProperty('token');
  });
});
