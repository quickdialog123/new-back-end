import { Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import type { CreateHotelDTO, UpdateHotelDTO } from './schemas/hotel.schema.js';

const hotelSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

const createdHotelSelect = {
  ...hotelSelect,
  users: {
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  },
} as const;

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateHotelDTO) {
    const passwordHash = await bcrypt.hash(input.owner.password, 12);

    const hotel = await this.prisma.$transaction((tx) =>
      tx.hotel.create({
        data: {
          name: input.name,
          phoneNumber: input.phoneNumber,
          token: input.token,
          users: {
            create: {
              email: input.owner.email,
              fullName: input.owner.fullName,
              passwordHash,
              role: 'OWNER',
            },
          },
        },
        select: createdHotelSelect,
      }),
    );

    const { users, ...safeHotel } = hotel;
    const [owner] = users;
    return {
      ...safeHotel,
      owner: {
        id: owner.id,
        email: owner.email,
        fullName: owner.fullName,
        role: owner.role,
      },
    };
  }

  findAll() {
    return this.prisma.hotel.findMany({
      select: hotelSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      select: hotelSelect,
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    return hotel;
  }

  update(id: string, input: UpdateHotelDTO) {
    return this.prisma.hotel.update({
      where: { id },
      data: input,
      select: hotelSelect,
    });
  }

  deactivate(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.update({
        where: { id },
        data: { active: false },
        select: hotelSelect,
      });

      await tx.user.updateMany({
        where: { hotelId: id },
        data: { active: false },
      });

      await tx.refreshSession.updateMany({
        where: {
          user: { hotelId: id },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      return hotel;
    });
  }
}
