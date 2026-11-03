import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from './meta/meta-graph.client.js';
import { decryptMetaToken } from './meta/meta-token.util.js';

export type WhatsAppStatusDto = {
  status:
    | 'connected'
    | 'not_connected'
    | 'pending_verification'
    | 'pending_registration'
    | 'error';
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

    if (!account || account.status === 'DISCONNECTED') {
      return this.notConnected();
    }

    const status = this.toPublicStatus(account.status);

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

  async requestPhoneVerificationCode(
    hotelId: string,
    method: 'SMS' | 'VOICE',
  ): Promise<WhatsAppStatusDto> {
    const account = await this.getAccountInStatus(
      hotelId,
      'PENDING_VERIFICATION',
    );

    await this.meta.requestPhoneVerificationCode(
      account.phoneNumberId,
      this.accessToken(account.accessTokenEncrypted),
      method,
    );

    return this.getStatus(hotelId);
  }

  async verifyPhoneNumberCode(
    hotelId: string,
    code: string,
  ): Promise<WhatsAppStatusDto> {
    const account = await this.getAccountInStatus(
      hotelId,
      'PENDING_VERIFICATION',
    );

    await this.meta.verifyPhoneNumberCode(
      account.phoneNumberId,
      this.accessToken(account.accessTokenEncrypted),
      code,
    );

    await this.prisma.whatsAppAccount.update({
      where: { id: account.id },
      data: { status: 'PENDING_REGISTRATION' },
    });

    return this.getStatus(hotelId);
  }

  async registerPhoneNumber(
    hotelId: string,
    pin: string,
  ): Promise<WhatsAppStatusDto> {
    const account = await this.getAccountInStatus(
      hotelId,
      'PENDING_REGISTRATION',
    );

    await this.meta.registerPhoneNumber(
      account.phoneNumberId,
      this.accessToken(account.accessTokenEncrypted),
      pin,
    );

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
        status: { not: 'DISCONNECTED' },
      },
      data: {
        status: 'DISCONNECTED',
        accessTokenEncrypted: null,
      },
    });

    return this.notConnected();
  }

  private notConnected(): WhatsAppStatusDto {
    return {
      status: 'not_connected',
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
      where: { hotelId, status: { not: 'DISCONNECTED' } },
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

  private toPublicStatus(status: string): WhatsAppStatusDto['status'] {
    switch (status) {
      case 'CONNECTED':
        return 'connected';
      case 'PENDING_VERIFICATION':
        return 'pending_verification';
      case 'PENDING_REGISTRATION':
        return 'pending_registration';
      default:
        return 'error';
    }
  }
}
