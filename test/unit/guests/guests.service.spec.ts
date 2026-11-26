import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { GuestsService } from '@quickdialog/guests/guests.service.js';

describe('GuestsService', () => {
  let service: GuestsService;
  const guestCreateMany = vi.fn();
  const guestDeleteMany = vi.fn();
  const guestFindFirst = vi.fn();
  const guestUpdateMany = vi.fn();
  const prisma = {
    guest: {
      createMany: guestCreateMany,
      deleteMany: guestDeleteMany,
      findFirst: guestFindFirst,
      updateMany: guestUpdateMany,
    },
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
        marketingConsent: true,
        checkInDate: new Date('2026-11-19T00:00:00.000Z'),
        checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
        roomNumber: 101,
        floorNumber: 1,
      },
      {
        firstName: 'Second',
        lastName: 'Guest',
        email: 'second@example.com',
        phoneNumber: '+1 555 010 0002',
        marketingConsent: false,
        checkInDate: new Date('2026-11-19T00:00:00.000Z'),
        checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
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

  it.each([
    ['checkout equals check-in', new Date('2026-11-19T00:00:00.000Z')],
    ['checkout is before check-in', new Date('2026-11-18T00:00:00.000Z')],
  ])('rejects an update when %s', async (_description, checkOutDate) => {
    guestFindFirst.mockResolvedValue({
      id: 'guest-id',
      hotelId: 'hotel-id',
      checkInDate: new Date('2026-11-19T00:00:00.000Z'),
      checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
    });

    await expect(
      service.update('hotel-id', 'guest-id', { checkOutDate }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(guestFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'guest-id', hotelId: 'hotel-id' },
      }),
    );
    expect(guestUpdateMany).not.toHaveBeenCalled();
  });

  it('updates a guest when the resulting stay dates are valid', async () => {
    const existingGuest = {
      id: 'guest-id',
      hotelId: 'hotel-id',
      checkInDate: new Date('2026-11-19T00:00:00.000Z'),
      checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
    };
    const updatedGuest = {
      ...existingGuest,
      checkOutDate: new Date('2026-11-21T00:00:00.000Z'),
    };
    guestFindFirst
      .mockResolvedValueOnce(existingGuest)
      .mockResolvedValueOnce(updatedGuest);
    guestUpdateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.update('hotel-id', 'guest-id', {
        checkOutDate: updatedGuest.checkOutDate,
      }),
    ).resolves.toEqual(updatedGuest);

    expect(guestUpdateMany).toHaveBeenCalledWith({
      where: { id: 'guest-id', hotelId: 'hotel-id' },
      data: { checkOutDate: updatedGuest.checkOutDate },
    });
  });

  it('reports an update failure if the guest is no longer available to update', async () => {
    guestFindFirst.mockResolvedValue({
      id: 'guest-id',
      hotelId: 'hotel-id',
      checkInDate: new Date('2026-11-19T00:00:00.000Z'),
      checkOutDate: new Date('2026-11-20T00:00:00.000Z'),
    });
    guestUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update('hotel-id', 'guest-id', { firstName: 'Updated' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(guestUpdateMany).toHaveBeenCalledWith({
      where: { id: 'guest-id', hotelId: 'hotel-id' },
      data: { firstName: 'Updated' },
    });
    expect(guestFindFirst).toHaveBeenCalledOnce();
  });

  it('returns not found when deleting a guest that does not exist in the hotel', async () => {
    guestDeleteMany.mockResolvedValue({ count: 0 });

    await expect(
      service.remove('hotel-id', 'missing-guest'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(guestDeleteMany).toHaveBeenCalledWith({
      where: { id: 'missing-guest', hotelId: 'hotel-id' },
    });
  });
});
