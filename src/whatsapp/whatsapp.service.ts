import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from './meta/meta-graph.client.js';
import { decryptMetaToken } from './meta/meta-token.util.js';
import { WhatsAppAccountStatus } from '@quickdialog/generated/prisma/enums.js';
import { MetaRegisterPhoneNumberResponse } from './meta/meta.types.js';

export type WhatsAppStatusDto = {
  status: WhatsAppAccountStatus;
  wabaId: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  wabaStatus: 'APPROVED' | 'PENDING' | 'RESTRICTED' | null;
  qualityRating: 'GREEN' | 'YELLOW' | 'RED' | null;
  connectedAt: string | null;
  errorMessage: string | null;
};

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphClient,
    private readonly config: ConfigService,
  ) {}

  async getStatus(hotelId: string): Promise<WhatsAppStatusDto> {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { hotelId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!account || account.status === 'NOT_CONNECTED') {
      return this.notConnected();
    }

    const status = account.status as WhatsAppAccountStatus;

    return {
      status,
      wabaId: account.wabaId,
      phoneNumber: account.displayPhoneNumber,
      displayName: account.verifiedName,
      wabaStatus: null,
      qualityRating: null,
      connectedAt:
        account.status === 'CONNECTED'
          ? (account.connectedAt?.toISOString() ?? null)
          : null,
      errorMessage: null,
    };
  }

  async registerPhoneNumber(
    hotelId: string,
    pin: string,
  ): Promise<WhatsAppStatusDto> {
    const account = await this.getAccountInStatus(hotelId, 'UNVERIFIED');

    const registerResponse: MetaRegisterPhoneNumberResponse =
      await this.meta.registerPhoneNumber(
        account.phoneNumberId,
        this.accessToken(account.accessTokenEncrypted),
        pin,
      );

    if (!registerResponse.success) {
      throw new BadRequestException('Failed to register phone number in Meta');
    }

    await this.prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: {
        status: 'CONNECTED',
        connectedAt: new Date(),
      },
    });

    return this.getStatus(hotelId);
  }

  async disconnect(hotelId: string): Promise<WhatsAppStatusDto> {
    await this.prisma.whatsAppAccount.updateMany({
      where: {
        hotelId,
        status: { not: 'NOT_CONNECTED' },
      },
      data: {
        status: 'NOT_CONNECTED',
        accessTokenEncrypted: null,
      },
    });

    return this.notConnected();
  }

  private notConnected(): WhatsAppStatusDto {
    return {
      status: WhatsAppAccountStatus.NOT_CONNECTED,
      wabaId: null,
      phoneNumber: null,
      displayName: null,
      wabaStatus: null,
      qualityRating: null,
      connectedAt: null,
      errorMessage: null,
    };
  }

  private async getAccountInStatus(hotelId: string, status: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { hotelId, status: { not: 'NOT_CONNECTED' } },
      orderBy: { updatedAt: 'desc' },
    });

    if (!account) {
      throw new NotFoundException('WhatsApp connection not found');
    }

    if (account.status !== status) {
      throw new BadRequestException(
        'WhatsApp connection is in the wrong state',
      );
    }

    const encryptedToken = account.accessTokenEncrypted;

    if (!encryptedToken) {
      throw new BadRequestException(
        'WhatsApp connection requires reconnection',
      );
    }

    return { ...account, accessTokenEncrypted: encryptedToken };
  }

  private accessToken(encryptedToken: string): string {
    const encryptionKey = this.config.getOrThrow<string>(
      'meta.tokenEncryptionKey',
    );

    return decryptMetaToken(encryptedToken, encryptionKey);
  }
}
