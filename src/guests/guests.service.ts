import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import type { CreateGuestDTO, UpdateGuestDTO } from './schemas/guest.schema.js';

const guestSelect = {
  id: true,
  hotelId: true,
  fullName: true,
  email: true,
  phoneNumber: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  create(hotelId: string, input: CreateGuestDTO) {
    return this.prisma.guest.create({
      data: { ...input, hotelId },
      select: guestSelect,
    });
  }

  createMany(hotelId: string, guests: CreateGuestDTO[]) {
    return this.prisma.guest.createMany({
      data: guests.map((guest) => ({ ...guest, hotelId })),
    });
  }

  removeMany(hotelId: string, ids: string[]) {
    return this.prisma.guest.deleteMany({
      where: { hotelId, id: { in: ids } },
    });
  }

  findAll(hotelId: string) {
    return this.prisma.guest.findMany({
      where: { hotelId },
      select: guestSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(hotelId: string, id: string) {
    const guest = await this.prisma.guest.findFirst({
      where: { id, hotelId },
      select: guestSelect,
    });

    if (!guest) throw new NotFoundException('Guest not found');
    return guest;
  }

  async update(hotelId: string, id: string, input: UpdateGuestDTO) {
    const result = await this.prisma.guest.updateMany({
      where: { id, hotelId },
      data: input,
    });

    if (result.count === 0) throw new NotFoundException('Guest not found');
    return this.findOne(hotelId, id);
  }

  async remove(hotelId: string, id: string) {
    const result = await this.prisma.guest.deleteMany({
      where: { id, hotelId },
    });

    if (result.count === 0) throw new NotFoundException('Guest not found');
  }
}
