import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { decryptMetaToken } from '../meta/meta-token.util.js';
import { MetaGraphClient } from '../meta/meta-graph.client.js';
import type {
  MetaProduct,
  MetaCatalog,
  MetaProductBatchRequest,
} from '../meta/meta.types.js';
import type { CreateProductDto, UpdateProductDto } from './product.schema.js';

@Injectable()
export class CatalogProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaGraphClient,
    private readonly config: ConfigService,
  ) {}

  async listCatalogs(hotelId: string): Promise<MetaCatalog[]> {
    const { businessId, accessToken } = await this.connection(hotelId);
    return this.meta.getProductCatalogs(businessId, accessToken);
  }

  async listProducts(hotelId: string, catalogId: string, after?: string) {
    const connection = await this.connection(hotelId);
    await this.assertCatalogAccess(connection, catalogId);
    const page = await this.meta.getCatalogProducts(
      catalogId,
      connection.accessToken,
      after,
    );
    return {
      data: page.data.map((product) => this.toProductDto(product)),
      paging: page.paging,
    };
  }

  async createProduct(
    hotelId: string,
    catalogId: string,
    input: CreateProductDto,
  ) {
    const connection = await this.connection(hotelId);
    await this.assertCatalogAccess(connection, catalogId);
    const productId = randomUUID();
    const request: MetaProductBatchRequest = {
      method: 'CREATE',
      data: {
        id: productId,
        title: input.name,
        description: input.description,
        link: input.productUrl,
        image: [{ url: input.imageUrl }],
        availability: input.availability,
        price: `${input.price} ${input.currency}`,
        brand: input.brand,
        condition: input.condition,
      },
    };
    return this.submitAndGetStatus(
      catalogId,
      connection.accessToken,
      request,
      productId,
    );
  }

  async updateProduct(
    hotelId: string,
    catalogId: string,
    productId: string,
    input: UpdateProductDto,
  ) {
    const connection = await this.connection(hotelId);
    await this.assertCatalogAccess(connection, catalogId);
    const data: Record<string, unknown> = { id: productId };
    if (input.name !== undefined) data.title = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.productUrl !== undefined) data.link = input.productUrl;
    if (input.imageUrl !== undefined) {
      data.image = [{ url: input.imageUrl }];
    }
    if (input.price !== undefined || input.currency !== undefined) {
      const current = await this.findProduct(
        catalogId,
        connection.accessToken,
        productId,
      );
      const existingPrice = this.parsePrice(current.price, current.currency);
      data.price = `${input.price ?? existingPrice.amount} ${input.currency ?? existingPrice.currency}`;
    }
    if (input.availability !== undefined)
      data.availability = input.availability;
    if (input.brand !== undefined) data.brand = input.brand;
    if (input.condition !== undefined) data.condition = input.condition;

    return this.submitAndGetStatus(
      catalogId,
      connection.accessToken,
      { method: 'UPDATE', data },
      productId,
    );
  }

  async deleteProduct(hotelId: string, catalogId: string, productId: string) {
    const connection = await this.connection(hotelId);
    await this.assertCatalogAccess(connection, catalogId);
    return this.submitAndGetStatus(catalogId, connection.accessToken, {
      method: 'DELETE',
      data: { id: productId },
    });
  }

  async getBatchStatus(hotelId: string, catalogId: string, handle: string) {
    const connection = await this.connection(hotelId);
    await this.assertCatalogAccess(connection, catalogId);
    const status = await this.meta.getCatalogBatchStatus(
      catalogId,
      connection.accessToken,
      handle,
    );
    this.assertBatchCompletedWithoutErrors(status);

    if (status.status !== 'finished') {
      return {
        handle: status.handle,
        status: status.status,
        errors: status.errors ?? [],
        warnings: status.warnings ?? [],
      };
    }

    return {
      handle: status.handle,
      status: status.status,
      errors: status.errors ?? [],
      warnings: status.warnings ?? [],
      products: (
        await this.meta.getCatalogProducts(catalogId, connection.accessToken)
      ).data.map((product) => this.toProductDto(product)),
    };
  }

  private async submitAndGetStatus(
    catalogId: string,
    accessToken: string,
    request: MetaProductBatchRequest,
    productId?: string,
  ) {
    const result = await this.meta.submitCatalogProductBatch(
      catalogId,
      accessToken,
      [request],
    );

    const validationErrors = result.validation_status?.flatMap((entry) =>
      (entry.errors ?? []).map((error) => error.message),
    );
    if (validationErrors?.length) {
      throw new BadRequestException({
        code: 'META_PRODUCT_VALIDATION_ERROR',
        message: 'Meta rejected the product data',
        details: validationErrors,
      });
    }

    const handle = result.handles?.[0];
    if (!handle) {
      throw new ServiceUnavailableException(
        'Meta did not return a product processing handle',
      );
    }

    const status = await this.meta.getCatalogBatchStatus(
      catalogId,
      accessToken,
      handle,
    );
    this.assertBatchCompletedWithoutErrors(status);

    if (status.status !== 'finished') {
      return {
        productId,
        handle: status.handle,
        status: status.status,
        errors: status.errors ?? [],
        warnings: status.warnings ?? [],
      };
    }

    const refreshed = await this.meta.getCatalogProducts(
      catalogId,
      accessToken,
    );
    return {
      productId,
      handle: status.handle,
      status: status.status,
      errors: status.errors ?? [],
      warnings: status.warnings ?? [],
      products: refreshed.data.map((product) => this.toProductDto(product)),
      paging: refreshed.paging,
    };
  }

  private assertBatchCompletedWithoutErrors(status: {
    status: string;
    errors_total_count?: number;
    errors?: Array<{ message: string }>;
    ids_of_invalid_requests?: string[];
  }): void {
    if ((status.errors_total_count ?? 0) > 0 || status.errors?.length) {
      throw new BadRequestException({
        code: 'META_PRODUCT_PROCESSING_ERROR',
        message: 'Meta could not process the product change',
        details: {
          errors: status.errors ?? [],
          invalidProductIds: status.ids_of_invalid_requests ?? [],
        },
      });
    }
  }

  private async findProduct(
    catalogId: string,
    accessToken: string,
    productId: string,
  ): Promise<MetaProduct> {
    let after: string | undefined;
    do {
      const page = await this.meta.getCatalogProducts(
        catalogId,
        accessToken,
        after,
      );
      const product = page.data.find(
        (item) => item.retailer_id === productId || item.id === productId,
      );
      if (product) return product;
      after = page.paging?.cursors?.after;
    } while (after);

    throw new NotFoundException('Product not found in this catalog');
  }

  private parsePrice(
    price: string | undefined,
    currency?: string,
  ): {
    amount: string;
    currency: string;
  } {
    if (!price) {
      throw new BadRequestException('Meta product has no price to preserve');
    }
    const match = /^(\d+(?:\.\d{1,2})?)(?:\s+([A-Z]{3}))?$/.exec(price);
    if (!match) {
      throw new BadRequestException('Meta returned an invalid product price');
    }
    const resolvedCurrency = match[2] ?? currency;
    if (!resolvedCurrency) {
      throw new BadRequestException(
        'Meta returned a product price without currency',
      );
    }
    return { amount: match[1]!, currency: resolvedCurrency };
  }

  private toProductDto(product: MetaProduct) {
    return {
      productId: product.retailer_id ?? product.id,
      name: product.name ?? '',
      description: product.description ?? null,
      productUrl: product.url ?? null,
      imageUrl: product.image_url ?? null,
      availability: product.availability ?? null,
      price: product.price ?? null,
      currency: product.currency ?? null,
      brand: product.brand ?? null,
      condition: product.condition ?? null,
    };
  }

  private async assertCatalogAccess(
    connection: { businessId: string; accessToken: string },
    catalogId: string,
  ): Promise<void> {
    const catalogs = await this.meta.getProductCatalogs(
      connection.businessId,
      connection.accessToken,
    );
    if (!catalogs.some((catalog) => catalog.id === catalogId)) {
      throw new NotFoundException('Product catalog not found for this hotel');
    }
  }

  private async connection(hotelId: string) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: { hotelId, status: { not: 'NOT_CONNECTED' } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!account?.businessId || !account.accessTokenEncrypted) {
      throw new NotFoundException('Connected Meta account not found for hotel');
    }
    const encryptionKey = this.config.getOrThrow<string>(
      'meta.tokenEncryptionKey',
    );
    return {
      businessId: account.businessId,
      accessToken: decryptMetaToken(
        account.accessTokenEncrypted,
        encryptionKey,
      ),
    };
  }
}
