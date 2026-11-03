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
      where: { id: hotelId },
      select: { id: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const current = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: { not: 'DISCONNECTED' },
      },
    });

    if (current) {
      throw new BadRequestException(
        'Disconnect the current WhatsApp account before connecting another one',
      );
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
      throw new BadRequestException(
        'This WhatsApp account is already linked to another hotel',
      );
    }

    if (matches.some((account) => account.status !== 'DISCONNECTED')) {
      throw new BadRequestException('This WhatsApp account is already active');
    }

    const matchingPhone = matches.find(
      (account) => account.phoneNumberId === input.phoneNumberId,
    );

    const matchingWaba = matches.find(
      (account) => account.wabaId === input.wabaId,
    );

    if (matchingPhone && matchingWaba && matchingPhone.id !== matchingWaba.id) {
      throw new BadRequestException(
        'Conflicting WhatsApp account records. Resolve the existing associations first.',
      );
    }

    const previous = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: 'DISCONNECTED',
      },
      orderBy: { updatedAt: 'desc' },
    });

    const existingAccount = matchingPhone ?? matchingWaba ?? previous;

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
      status:
        phone.code_verification_status?.toUpperCase() === 'VERIFIED'
          ? 'PENDING_REGISTRATION'
          : 'PENDING_VERIFICATION',
      connectedAt: null,
    };

    if (existingAccount) {
      await this.prisma.whatsAppAccount.update({
        where: { id: existingAccount.id },
        data,
      });
    } else {
      await this.prisma.whatsAppAccount.create({
        data: {
          hotelId,
          ...data,
        },
      });
    }

    return this.whatsappService.getStatus(hotelId);
  }
}
