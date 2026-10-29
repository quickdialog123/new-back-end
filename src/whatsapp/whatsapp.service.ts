import { Injectable } from '@nestjs/common';
import { PrismaService } from '@quickdialog/database/prisma.service.js';

// temp DTO
export type WhatsAppStatusDto = {
  status: 'connected' | 'not_connected' | 'error';
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
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(hotelId: string): Promise<WhatsAppStatusDto> {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { hotelId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!account || account.status === 'DISCONNECTED') {
      return this.notConnected();
    }

    return {
      status: account.status === 'CONNECTED' ? 'connected' : 'error',
      wabaId: account.wabaId,
      phoneNumber: account.displayPhoneNumber,
      displayName: account.verifiedName,
      wabaStatus: null,
      qualityRating: null,
      connectedAt: account.connectedAt.toISOString(),
      errorMessage: null,
    };
  }

  async disconnect(hotelId: string): Promise<WhatsAppStatusDto> {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: { not: 'DISCONNECTED' },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!account) {
      return this.notConnected();
    }

    await this.prisma.whatsAppAccount.update({
      where: { id: account.id },
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
}
