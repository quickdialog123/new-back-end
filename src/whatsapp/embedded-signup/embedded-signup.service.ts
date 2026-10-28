import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '../meta/meta-graph.client.js';
import type { CompleteEmbeddedSignupDto } from './schemas/complete-embedded-signup.schema.js';
import { ConfigService } from '@nestjs/config';
import { encryptMetaToken } from '../meta/meta-token.util.js';

@Injectable()
export class EmbeddedSignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphClient,
    private readonly config: ConfigService,
  ) {}

  async complete(hotelId: string, input: CompleteEmbeddedSignupDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const accessToken = await this.meta.exchangeCode(input.code);

    const phones = await this.meta.getPhoneNumbers(input.wabaId, accessToken);

    const phone = phones.find((item) => item.id === input.phoneNumberId);

    if (!phone) {
      throw new BadRequestException(
        'Phone number does not belong to the selected WhatsApp account',
      );
    }

    await this.meta.subscribeApp(input.wabaId, accessToken);

    const existingAccount = await this.prisma.whatsAppAccount.findFirst({
      where: {
        OR: [{ wabaId: input.wabaId }, { phoneNumberId: input.phoneNumberId }],
      },
    });

    if (existingAccount && existingAccount.hotelId !== hotelId) {
      throw new BadRequestException(
        'This WhatsApp account is already connected to another hotel',
      );
    }

    const encryptionKey = this.config.getOrThrow<string>(
      'meta.tokenEncryptionKey',
    );

    const accessTokenEncrypted = encryptMetaToken(accessToken, encryptionKey);

    const account = existingAccount
      ? await this.prisma.whatsAppAccount.update({
          where: {
            id: existingAccount.id,
          },
          data: {
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name,
            accessToken,
            status: 'CONNECTED',
          },
          select: {
            id: true,
            hotelId: true,
            wabaId: true,
            phoneNumberId: true,
            businessId: true,
            displayPhoneNumber: true,
            verifiedName: true,
            status: true,
            connectedAt: true,
            updatedAt: true,
          },
        })
      : await this.prisma.whatsAppAccount.create({
          data: {
            hotelId,
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name,
            accessTokenEncrypted,
            status: 'CONNECTED',
          },
          select: {
            id: true,
            hotelId: true,
            wabaId: true,
            phoneNumberId: true,
            businessId: true,
            displayPhoneNumber: true,
            verifiedName: true,
            status: true,
            connectedAt: true,
            updatedAt: true,
          },
        });

    return account;
  }
}
