import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { GuestsService } from '@quickdialog/guests/guests.service.js';

describe('GuestsService', () => {
  let service: GuestsService;
  const guestCreateMany = vi.fn();
  const guestDeleteMany = vi.fn();
  const prisma = {
    guest: { createMany: guestCreateMany, deleteMany: guestDeleteMany },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [GuestsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(GuestsService);
  });

  it('inserts the batch in one query and assigns the authenticated hotel ID', async () => {
    const guests = [
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
      },
    ];
    guestCreateMany.mockResolvedValue({ count: 2 });

    const result = await service.createMany('hotel-id', guests);

    expect(guestCreateMany).toHaveBeenCalledOnce();
    expect(guestCreateMany).toHaveBeenCalledWith({
      data: guests.map((guest) => ({
        ...guest,
        checkInDate: new Date(`${guest.checkInDate}T00:00:00.000Z`),
        checkOutDate: new Date(`${guest.checkOutDate}T00:00:00.000Z`),
        hotelId: 'hotel-id',
      })),
    });
    expect(result).toEqual({ count: 2 });
  });

  it('bulk deletes only guests matching the authenticated hotel and IDs', async () => {
    const ids = ['guest-id-1', 'guest-id-2'];
    guestDeleteMany.mockResolvedValue({ count: 1 });

    const result = await service.removeMany('hotel-id', ids);

    expect(guestDeleteMany).toHaveBeenCalledOnce();
    expect(guestDeleteMany).toHaveBeenCalledWith({
      where: { hotelId: 'hotel-id', id: { in: ids } },
    });
    expect(result).toEqual({ count: 1 });
  });
});
