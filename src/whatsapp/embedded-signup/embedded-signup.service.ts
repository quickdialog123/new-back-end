import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '../meta/meta-graph.client.js';
import { encryptMetaToken } from '../meta/meta-token.util.js';
import { WhatsappService } from '../whatsapp.service.js';
import type { CompleteEmbeddedSignupDto } from './schemas/complete-embedded-signup.schema.js';

@Injectable()
export class EmbeddedSignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphClient,
    private readonly config: ConfigService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async complete(hotelId: string, input: CompleteEmbeddedSignupDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: {
        id: hotelId,
      },
      select: {
        id: true,
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const activeAccount = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: {
          not: 'DISCONNECTED',
        },
      },
    });

    if (
      activeAccount &&
      (activeAccount.wabaId !== input.wabaId ||
        activeAccount.phoneNumberId !== input.phoneNumberId)
    ) {
      throw new BadRequestException(
        'Disconnect the current WhatsApp account before connecting another one',
      );
    }

    const existingAccount =
      activeAccount ??
      (await this.prisma.whatsAppAccount.findFirst({
        where: {
          OR: [
            {
              wabaId: input.wabaId,
            },
            {
              phoneNumberId: input.phoneNumberId,
            },
          ],
        },
      }));

    if (existingAccount && existingAccount.hotelId !== hotelId) {
      throw new BadRequestException(
        'This WhatsApp account is already connected to another hotel',
      );
    }

    if (
      existingAccount &&
      (existingAccount.wabaId !== input.wabaId ||
        existingAccount.phoneNumberId !== input.phoneNumberId)
    ) {
      throw new BadRequestException(
        'WhatsApp account identifiers do not match',
      );
    }

    const accessToken = await this.meta.exchangeCode(input.code);
    const businessId = await this.meta.getClientBusinessId(accessToken);
    const phones = await this.meta.getPhoneNumbers(input.wabaId, accessToken);
    const phone = phones.find((item) => item.id === input.phoneNumberId);

    if (!phone) {
      throw new BadRequestException(
        'Phone number does not belong to the selected WhatsApp account',
      );
    }

    /**
     * subscribe QuickDialog meta app
     */
    await this.meta.subscribeApp(input.wabaId, accessToken);

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
            businessId,
            phoneNumberId: input.phoneNumberId,
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name,
            accessTokenEncrypted,
            status: 'CONNECTED',
            connectedAt: new Date(),
          },
        })
      : await this.prisma.whatsAppAccount.create({
          data: {
            hotelId,
            businessId,
            wabaId: input.wabaId,
            phoneNumberId: input.phoneNumberId,
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name,
            accessTokenEncrypted,
            status: 'CONNECTED',
            connectedAt: new Date(),
          },
        });

    return this.whatsappService.getStatus(account.hotelId);
  }
}
