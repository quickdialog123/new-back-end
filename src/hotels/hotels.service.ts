import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

    try {
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

      const [owner] = hotel.users;
      return {
        ...this.safeHotel(hotel),
        owner: {
          id: owner.id,
          email: owner.email,
          fullName: owner.fullName,
          role: owner.role,
        },
      };
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
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

  async update(id: string, input: UpdateHotelDTO) {
    try {
      return await this.prisma.hotel.update({
        where: { id },
        data: input,
        select: hotelSelect,
      });
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  async deactivate(id: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
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
    } catch (error) {
      this.rethrowDatabaseError(error);
    }
  }

  private safeHotel<T extends { token?: string; users?: unknown }>(hotel: T) {
    const { token: _token, users: _users, ...safeHotel } = hotel;
    return safeHotel;
  }

  private rethrowDatabaseError(error: unknown): never {
    if (!this.isPrismaError(error)) {
      throw error;
    }

    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : typeof error.meta?.target === 'string'
          ? error.meta.target
          : '';
      if (target.toLowerCase().includes('email')) {
        throw new ConflictException('Owner email already exists');
      }
      throw new ConflictException('Hotel token already exists');
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Hotel not found');
    }

    throw error;
  }

  private isPrismaError(
    error: unknown,
  ): error is { code: string; meta?: { target?: unknown } } {
    return typeof error === 'object' && error !== null && 'code' in error;
  }
}
