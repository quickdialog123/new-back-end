import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '../meta/meta-graph.client.js';
import { decryptMetaToken } from '../meta/meta-token.util.js';
import type { UpdateCatalogSettingsDto } from './schemas/catalog.schema.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphClient,
    private readonly config: ConfigService,
  ) {}

  async connectCatalog(hotelId: string, catalogId: string) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    await this.meta.connectCatalogToWaba(account.wabaId, catalogId, token);

    return this.getConnection(hotelId);
  }

  async getConnection(hotelId: string) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    const catalogs = await this.meta.getWabaCatalogs(account.wabaId, token);

    const catalog = catalogs[0] ?? null;

    if (!catalog) {
      return {
        status: 'not_connected' as const,
        catalog: null,
        catalogVisible: false,
        cartEnabled: false,
      };
    }

    const settings = await this.meta.getCommerceSettings(
      account.phoneNumberId,
      token,
    );

    return {
      status: settings?.is_catalog_visible
        ? ('connected' as const)
        : ('hidden' as const),
      catalog: {
        id: catalog.id,
        name: catalog.name,
        vertical: catalog.vertical ?? null,
        productCount: catalog.product_count ?? 0,
      },
      catalogVisible: settings?.is_catalog_visible ?? false,
      cartEnabled: settings?.is_cart_enabled ?? false,
    };
  }

  async updateSettings(hotelId: string, input: UpdateCatalogSettingsDto) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    const catalogs = await this.meta.getWabaCatalogs(account.wabaId, token);

    if (catalogs.length === 0) {
      throw new BadRequestException(
        'No catalog is connected to this WhatsApp account',
      );
    }

    await this.meta.updateCommerceSettings(account.phoneNumberId, token, input);

    return this.getConnection(hotelId);
  }

  async getAvailableCatalogs(hotelId: string) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    const systemUserId = await this.meta.getSystemUserId(token);

    const [availableCatalogs, connectedCatalogs] = await Promise.all([
      this.meta.getAssignedCatalogs(systemUserId, token),
      this.meta.getWabaCatalogs(account.wabaId, token),
    ]);

    const connectedCatalogId = connectedCatalogs[0]?.id ?? null;

    return availableCatalogs.map((catalog) => ({
      id: catalog.id,
      name: catalog.name,
      vertical: catalog.vertical ?? null,
      productCount: catalog.product_count ?? 0,
      connected: catalog.id === connectedCatalogId,
    }));
  }

  async disconnectCatalog(hotelId: string) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    const catalogs = await this.meta.getWabaCatalogs(account.wabaId, token);

    const catalog = catalogs[0];

    if (!catalog) {
      return this.getConnection(hotelId);
    }

    await this.meta.disconnectCatalogFromWaba(
      account.wabaId,
      catalog.id,
      token,
    );

    return this.getConnection(hotelId);
  }

  // shared query function for DRY rule
  private async getConnectedAccount(hotelId: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: 'CONNECTED',
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!account) {
      throw new NotFoundException('WhatsApp account is not connected');
    }

    if (!account.accessTokenEncrypted) {
      throw new BadRequestException('WhatsApp account requires reconnection');
    }

    const encryptionKey = this.config.getOrThrow<string>(
      'meta.tokenEncryptionKey',
    );

    const token = decryptMetaToken(account.accessTokenEncrypted, encryptionKey);

    return {
      account,
      token,
    };
  }
}
