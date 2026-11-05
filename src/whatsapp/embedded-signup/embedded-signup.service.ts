import {
  BadRequestException,
  ConflictException,
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
      where: { id: hotelId },
      select: { id: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const accessToken = await this.meta.exchangeCode(input.code);

    const [businessId, phones] = await Promise.all([
      this.meta.getClientBusinessId(accessToken),
      this.meta.getPhoneNumbers(input.wabaId, accessToken),
    ]);

    const phone = phones.find((item) => item.id === input.phoneNumberId);

    if (!phone) {
      throw new BadRequestException(
        'Phone number does not belong to the selected WhatsApp account',
      );
    }
    const matches = await this.prisma.whatsAppAccount.findMany({
      where: {
        OR: [{ wabaId: input.wabaId }, { phoneNumberId: input.phoneNumberId }],
      },
    });

    if (matches.some((account) => account.hotelId !== hotelId)) {
      throw new ConflictException(
        'This WhatsApp account is already linked to another hotel',
      );
    }

    const matchingWaba = matches.find(
      (account) => account.wabaId === input.wabaId,
    );

    const matchingPhone = matches.find(
      (account) => account.phoneNumberId === input.phoneNumberId,
    );

    if (matchingWaba && matchingPhone && matchingWaba.id !== matchingPhone.id) {
      throw new ConflictException(
        'WhatsApp account identifiers conflict with existing records',
      );
    }

    const existingAccount = matchingWaba ?? matchingPhone;

    if (
      matches.some(
        (account) =>
          account.id !== existingAccount?.id &&
          account.phoneNumberId === input.phoneNumberId,
      )
    ) {
      throw new ConflictException(
        'Phone number is already linked to another WhatsApp account',
      );
    }

    // Subscribe before saving the connection.
    await this.meta.subscribeApp(input.wabaId, accessToken);

    const encryptionKey = this.config.getOrThrow<string>(
      'meta.tokenEncryptionKey',
    );

    const data = {
      businessId,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: phone.display_phone_number,
      verifiedName: phone.verified_name,
      accessTokenEncrypted: encryptMetaToken(accessToken, encryptionKey),
      status: 'CONNECTED' as const,
      connectedAt: new Date(),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppAccount.updateMany({
        where: {
          hotelId,
          status: { not: 'DISCONNECTED' },
          ...(existingAccount ? { id: { not: existingAccount.id } } : {}),
        },
        data: {
          status: 'DISCONNECTED',
        },
      });

      if (existingAccount) {
        await tx.whatsAppAccount.update({
          where: { id: existingAccount.id },
          data,
        });
      } else {
        await tx.whatsAppAccount.create({
          data: {
            hotelId,
            ...data,
          },
        });
      }
    });

    return this.whatsappService.getStatus(hotelId);
  }
}
