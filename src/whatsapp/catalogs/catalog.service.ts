import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '../meta/meta-graph.client.js';
import { decryptMetaToken } from '../meta/meta-token.util.js';
import type {
  ConnectCatalogDto,
  CreateCatalogDto,
  UpdateCatalogSettingsDto,
} from './schemas/catalog.schema.js';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphClient,
    private readonly config: ConfigService,
  ) {}

  async getConnection(hotelId: string) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    const [catalogs, commerceSettings] = await Promise.all([
      this.meta.getWabaCatalogs(account.wabaId, token),
      this.meta.getCommerceSettings(account.phoneNumberId, token),
    ]);

    const catalog = catalogs[0] ?? null;

    if (!catalog) {
      return {
        status: 'not_connected' as const,
        catalog: null,
        catalogVisible: false,
        cartEnabled: false,
      };
    }

    const catalogVisible = commerceSettings?.is_catalog_visible ?? false;

    return {
      status: catalogVisible ? 'connected' : 'hidden',

      catalog: {
        id: catalog.id,
        name: catalog.name,
        vertical: catalog.vertical ?? null,
        productCount: catalog.product_count ?? null,
      },
      catalogVisible,
      cartEnabled: commerceSettings?.is_cart_enabled ?? false,
    };
  }

  async getAvailableCatalogs(hotelId: string) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    if (!account.businessId) {
      throw new BadRequestException(
        'WhatsApp account is missing Meta business information',
      );
    }

    const [ownedCatalogs, connectedCatalogs] = await Promise.all([
      this.meta.getOwnedCatalogs(account.businessId, token),
      this.meta.getWabaCatalogs(account.wabaId, token),
    ]);

    const connectedIds = new Set(
      connectedCatalogs.map((catalog) => catalog.id),
    );

    return ownedCatalogs
      .filter((catalog) => catalog.vertical === 'commerce')
      .map((catalog) => ({
        id: catalog.id,
        name: catalog.name,
        vertical: catalog.vertical ?? null,
        productCount: catalog.product_count ?? 0,
        connected: connectedIds.has(catalog.id),
      }));
  }

  async createCatalog(hotelId: string, input: CreateCatalogDto) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    if (!account.businessId) {
      throw new BadRequestException(
        'WhatsApp account is missing Meta business information',
      );
    }

    const connectedCatalogs = await this.meta.getWabaCatalogs(
      account.wabaId,
      token,
    );

    if (connectedCatalogs.length > 0) {
      throw new BadRequestException(
        'A catalog is already connected to this WhatsApp account',
      );
    }

    const ownedCatalogs = await this.meta.getOwnedCatalogs(
      account.businessId,
      token,
    );

    const duplicate = ownedCatalogs.find(
      (catalog) =>
        catalog.vertical === 'commerce' &&
        catalog.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
    );

    if (duplicate) {
      throw new BadRequestException(
        'A catalog with this name already exists. Connect the existing catalog instead.',
      );
    }

    const catalogId = await this.meta.createCatalog(
      account.businessId,
      input.name,
      token,
    );

    await this.meta.connectCatalogToWaba(account.wabaId, catalogId, token);

    await this.meta.updateCommerceSettings(account.phoneNumberId, token, {
      catalogVisible: true,
      cartEnabled: true,
    });

    return this.getConnection(hotelId);
  }

  async connectCatalog(hotelId: string, input: ConnectCatalogDto) {
    const { account, token } = await this.getConnectedAccount(hotelId);

    if (!account.businessId) {
      throw new BadRequestException(
        'WhatsApp account is missing Meta business information',
      );
    }

    const connectedCatalogs = await this.meta.getWabaCatalogs(
      account.wabaId,
      token,
    );

    if (connectedCatalogs.length > 0) {
      const alreadyConnected = connectedCatalogs.some(
        (catalog) => catalog.id === input.catalogId,
      );

      if (alreadyConnected) {
        return this.getConnection(hotelId);
      }

      throw new BadRequestException(
        'A different catalog is already connected to this WhatsApp account',
      );
    }

    const ownedCatalogs = await this.meta.getOwnedCatalogs(
      account.businessId,
      token,
    );

    const catalog = ownedCatalogs.find((item) => item.id === input.catalogId);

    if (!catalog) {
      throw new BadRequestException(
        'Catalog does not belong to this Meta business',
      );
    }

    if (catalog.vertical !== 'commerce') {
      throw new BadRequestException('Only commerce catalogs are supported');
    }

    await this.meta.connectCatalogToWaba(account.wabaId, catalog.id, token);

    await this.meta.updateCommerceSettings(account.phoneNumberId, token, {
      catalogVisible: true,
      cartEnabled: true,
    });

    return this.getConnection(hotelId);
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
