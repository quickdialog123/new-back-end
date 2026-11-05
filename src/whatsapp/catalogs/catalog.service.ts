import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '../meta/meta-graph.client.js';
import { ConfigService } from '@nestjs/config';
import { decryptMetaToken, encryptMetaToken } from '../meta/meta-token.util.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphClient,
    private readonly config: ConfigService,
  ) {}

  async getCatalogs(hotelId: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: 'CONNECTED',
      },
    });

    if (!account) throw new NotFoundException('WhatsApp account not connected');

    if (!account.businessId || !account.accessTokenEncrypted)
      throw new BadRequestException('WhatsApp account is not fully configured');

    const encryptionKey = this.config.getOrThrow<string>(
      'meta.tokenEncryptionKey',
    );

    const token = decryptMetaToken(account.accessTokenEncrypted, encryptionKey);

    this.meta.getProductcatalogs(account.wabaId, token);
    return '';
  }
}
