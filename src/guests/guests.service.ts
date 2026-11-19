import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import type { CreateGuestDTO, UpdateGuestDTO } from './schemas/guest.schema.js';

const guestSelect = {
  id: true,
  hotelId: true,
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  address: true,
  checkInDate: true,
  checkOutDate: true,
  roomNumber: true,
  floorNumber: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  create(hotelId: string, input: CreateGuestDTO) {
    return this.prisma.guest.create({
      data: { ...this.toPrismaDates(input), hotelId },
      select: guestSelect,
    });
  }

  createMany(hotelId: string, guests: CreateGuestDTO[]) {
    return this.prisma.guest.createMany({
      data: guests.map((guest) => ({ ...this.toPrismaDates(guest), hotelId })),
    });
  }

  removeMany(hotelId: string, ids: string[]) {
    return this.prisma.guest.deleteMany({
      where: { hotelId, id: { in: ids } },
    });
  }

  async findAll(hotelId: string) {
    const guests = await this.prisma.guest.findMany({
      where: { hotelId },
      select: guestSelect,
      orderBy: { createdAt: 'desc' },
    });
    return guests;
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
    const existing = await this.findOne(hotelId, id);
    const checkInTimestamp =
      input.checkInDate === undefined
        ? existing.checkInDate.getTime()
        : Date.parse(input.checkInDate);
    const checkOutTimestamp =
      input.checkOutDate === undefined
        ? existing.checkOutDate.getTime()
        : Date.parse(input.checkOutDate);
    if (checkOutTimestamp <= checkInTimestamp) {
      throw new BadRequestException(
        'Check-out date must be after check-in date',
      );
    }

    const result = await this.prisma.guest.updateMany({
      where: { id, hotelId },
      data: this.toPrismaDates(input),
    });

    if (result.count === 0)
      throw new UnprocessableEntityException('Failed to update guest');
    return this.findOne(hotelId, id);
  }

  async remove(hotelId: string, id: string) {
    const result = await this.prisma.guest.deleteMany({
      where: { id, hotelId },
    });

    if (result.count === 0) throw new NotFoundException('Guest not found');
  }

  private toPrismaDates<T extends Partial<CreateGuestDTO>>(input: T) {
    return {
      ...input,
      ...(input.checkInDate !== undefined && {
        checkInDate: new Date(`${input.checkInDate}T00:00:00.000Z`),
      }),
      ...(input.checkOutDate !== undefined && {
        checkOutDate: new Date(`${input.checkOutDate}T00:00:00.000Z`),
      }),
    };
  }
}
