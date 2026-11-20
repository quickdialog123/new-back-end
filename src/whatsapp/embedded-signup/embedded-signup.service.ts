import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { WhatsAppAccountStatus } from '@quickdialog/generated/prisma/client.js';
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

    const accounts = await this.prisma.whatsAppAccount.findMany({
      where: {
        OR: [
          { hotelId },
          { wabaId: input.wabaId },
          { phoneNumberId: input.phoneNumberId },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ownedByAnotherHotel = accounts.some(
      (account) =>
        account.hotelId !== hotelId &&
        (account.wabaId === input.wabaId ||
          account.phoneNumberId === input.phoneNumberId),
    );

    if (ownedByAnotherHotel) {
      throw new BadRequestException(
        'This WhatsApp account is already linked to another hotel',
      );
    }

    const hotelAccounts = accounts.filter(
      (account) => account.hotelId === hotelId,
    );

    const matchingPhone = hotelAccounts.find(
      (account) => account.phoneNumberId === input.phoneNumberId,
    );

    const matchingWaba = hotelAccounts.find(
      (account) => account.wabaId === input.wabaId,
    );

    if (matchingPhone && matchingWaba && matchingPhone.id !== matchingWaba.id) {
      throw new BadRequestException(
        'Conflicting WhatsApp account records. Resolve the existing associations first.',
      );
    }

    const matchingAccount = matchingPhone ?? matchingWaba;

    const sameConnectedAccount =
      matchingAccount?.status === WhatsAppAccountStatus.CONNECTED &&
      matchingAccount.wabaId === input.wabaId &&
      matchingAccount.phoneNumberId === input.phoneNumberId;

    const hasOtherActiveAccount = hotelAccounts.some(
      (account) =>
        account.id !== matchingAccount?.id &&
        account.status !== WhatsAppAccountStatus.NOT_CONNECTED,
    );

    if (sameConnectedAccount && !hasOtherActiveAccount) {
      return this.whatsappService.getStatus(hotelId);
    }

    const activeAccount = hotelAccounts.find(
      (account) => account.status !== WhatsAppAccountStatus.NOT_CONNECTED,
    );

    const disconnectedAccount = hotelAccounts.find(
      (account) => account.status === WhatsAppAccountStatus.NOT_CONNECTED,
    );

    const existingAccount =
      matchingAccount ?? activeAccount ?? disconnectedAccount;

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
      status: WhatsAppAccountStatus.UNVERIFIED,
      connectedAt: null,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppAccount.updateMany({
        where: {
          hotelId,
          status: {
            not: WhatsAppAccountStatus.NOT_CONNECTED,
          },
        },
        data: {
          status: WhatsAppAccountStatus.NOT_CONNECTED,
          connectedAt: null,
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
