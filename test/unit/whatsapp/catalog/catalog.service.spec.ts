import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';
import { encryptMetaToken } from '@quickdialog/whatsapp/meta/meta-token.util.js';
import { CatalogService } from '@quickdialog/whatsapp/catalog/catalog.service.js';

describe('CatalogService', () => {
  let service: CatalogService;
  const findFirst = vi.fn();
  const config = { getOrThrow: vi.fn() };
  const meta = {
    getProductCatalogs: vi.fn(),
    getCatalogProducts: vi.fn(),
    submitCatalogProductBatch: vi.fn(),
    getCatalogBatchStatus: vi.fn(),
    connectCatalogToWaba: vi.fn(),
    disconnectCatalogFromWaba: vi.fn(),
    getWabaCatalogs: vi.fn(),
    getCommerceSettings: vi.fn(),
    getSystemUserId: vi.fn(),
    getAssignedCatalogs: vi.fn(),
    updateCommerceSettings: vi.fn(),
  };
  const encryptionKey = Buffer.alloc(32, 1).toString('base64');
  const prisma = { whatsAppAccount: { findFirst } };
  const account = {
    businessId: 'business-id',
    accessTokenEncrypted: encryptMetaToken('hotel-meta-token', encryptionKey),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    findFirst.mockResolvedValue(account);
    config.getOrThrow.mockReturnValue(encryptionKey);
    meta.getProductCatalogs.mockResolvedValue([
      { id: 'catalog-a', name: 'Hotel catalog' },
    ]);
    meta.getCatalogProducts.mockResolvedValue({ data: [] });
    meta.submitCatalogProductBatch.mockResolvedValue({
      handles: ['batch-handle'],
      validation_status: [],
    });
    meta.getCatalogBatchStatus.mockResolvedValue({
      handle: 'batch-handle',
      status: 'finished',
      errors_total_count: 0,
      warnings: [],
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: prisma },
        { provide: MetaGraphClient, useValue: meta },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(CatalogService);
  });

  it('lists only catalogs available through the authenticated hotel account', async () => {
    await expect(service.listCatalogs('hotel-id')).resolves.toEqual([
      { id: 'catalog-a', name: 'Hotel catalog' },
    ]);
    expect(findFirst).toHaveBeenCalledWith({
      where: { hotelId: 'hotel-id', status: { not: 'NOT_CONNECTED' } },
      orderBy: { updatedAt: 'desc' },
    });
    expect(meta.getProductCatalogs).toHaveBeenCalledWith(
      'business-id',
      'hotel-meta-token',
    );
  });

  it('manages WhatsApp catalog connections and settings', async () => {
    findFirst.mockResolvedValue({
      ...account,
      wabaId: 'waba-id',
      phoneNumberId: 'phone-id',
      status: 'CONNECTED',
    });
    meta.getWabaCatalogs.mockResolvedValue([
      {
        id: 'catalog-a',
        name: 'Hotel catalog',
        vertical: 'commerce',
        product_count: 4,
      },
    ]);
    meta.getCommerceSettings.mockResolvedValue({
      is_catalog_visible: true,
      is_cart_enabled: false,
    });
    meta.getSystemUserId.mockResolvedValue('system-user-id');
    meta.getAssignedCatalogs.mockResolvedValue([
      { id: 'catalog-b', name: 'Available catalog' },
    ]);

    await expect(
      service.connectCatalog('hotel-id', 'catalog-a'),
    ).resolves.toMatchObject({
      status: 'connected',
      catalog: { id: 'catalog-a', productCount: 4 },
    });
    expect(meta.connectCatalogToWaba).toHaveBeenCalledWith(
      'waba-id',
      'catalog-a',
      'hotel-meta-token',
    );

    await expect(service.getAvailableCatalogs('hotel-id')).resolves.toEqual([
      {
        id: 'catalog-b',
        name: 'Available catalog',
        vertical: null,
        productCount: 0,
      },
    ]);
    expect(meta.getAssignedCatalogs).toHaveBeenCalledWith(
      'system-user-id',
      'hotel-meta-token',
    );

    await expect(
      service.updateSettings('hotel-id', {
        catalogVisible: false,
        cartEnabled: true,
      }),
    ).resolves.toMatchObject({ status: 'connected' });
    expect(meta.updateCommerceSettings).toHaveBeenCalledWith(
      'phone-id',
      'hotel-meta-token',
      { catalogVisible: false, cartEnabled: true },
    );

    await expect(service.disconnectCatalog('hotel-id')).resolves.toMatchObject({
      status: 'connected',
    });
    expect(meta.disconnectCatalogFromWaba).toHaveBeenCalledWith(
      'waba-id',
      'catalog-a',
      'hotel-meta-token',
    );
  });

  it('rejects a catalog that is not accessible to the hotel', async () => {
    await expect(
      service.listProducts('hotel-id', 'other-catalog'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(meta.getCatalogProducts).not.toHaveBeenCalled();
  });

  it('returns a frontend product shape using Meta retailer IDs', async () => {
    meta.getCatalogProducts.mockResolvedValue({
      data: [
        {
          id: 'meta-graph-object-id',
          retailer_id: 'hotel-product-id',
          name: 'Coffee',
          image_url: 'https://cdn.example.com/coffee.jpg',
          price: '12.50 USD',
        },
      ],
      paging: { cursors: { after: 'next-page' } },
    });

    await expect(
      service.listProducts('hotel-id', 'catalog-a'),
    ).resolves.toEqual({
      data: [
        {
          productId: 'hotel-product-id',
          name: 'Coffee',
          description: null,
          productUrl: null,
          imageUrl: 'https://cdn.example.com/coffee.jpg',
          availability: null,
          price: '12.50 USD',
          currency: null,
          brand: null,
          condition: null,
        },
      ],
      paging: { cursors: { after: 'next-page' } },
    });
  });

  it('creates a product in Meta and returns its generated retailer ID and status', async () => {
    const result = await service.createProduct('hotel-id', 'catalog-a', {
      name: 'Coffee',
      description: 'Freshly roasted coffee',
      productUrl: 'https://shop.example.com/coffee',
      imageUrl: 'https://cdn.example.com/coffee.jpg',
      price: '12.50',
      currency: 'USD',
      availability: 'in stock',
      brand: 'QuickDialog',
      condition: 'new',
    });

    expect(meta.submitCatalogProductBatch).toHaveBeenCalledWith(
      'catalog-a',
      'hotel-meta-token',
      [
        {
          method: 'CREATE',
          data: expect.objectContaining({
            id: expect.any(String),
            title: 'Coffee',
            link: 'https://shop.example.com/coffee',
            image: [{ url: 'https://cdn.example.com/coffee.jpg' }],
            price: '12.50 USD',
          }),
        },
      ],
    );
    expect(result).toMatchObject({
      productId: expect.any(String),
      status: 'finished',
    });
  });

  it('does not claim a batch completed when Meta is still processing it', async () => {
    meta.getCatalogBatchStatus.mockResolvedValue({
      handle: 'batch-handle',
      status: 'running',
      errors_total_count: 0,
      warnings: [],
    });

    const result = await service.deleteProduct(
      'hotel-id',
      'catalog-a',
      'retailer-product-id',
    );

    expect(result).toEqual({
      handle: 'batch-handle',
      status: 'running',
      errors: [],
      warnings: [],
    });
  });

  it('preserves the existing currency when only the price is changed', async () => {
    meta.getCatalogProducts.mockResolvedValue({
      data: [
        {
          id: 'graph-id',
          retailer_id: 'retailer-id',
          price: '12.50 USD',
        },
      ],
    });

    await service.updateProduct('hotel-id', 'catalog-a', 'retailer-id', {
      price: '14.00',
    });

    expect(meta.submitCatalogProductBatch).toHaveBeenCalledWith(
      'catalog-a',
      'hotel-meta-token',
      [
        {
          method: 'UPDATE',
          data: { id: 'retailer-id', price: '14.00 USD' },
        },
      ],
    );
  });

  it('surfaces Meta validation errors from completed batches', async () => {
    meta.getCatalogBatchStatus.mockResolvedValue({
      handle: 'batch-handle',
      status: 'finished',
      errors_total_count: 1,
      warnings: [],
      errors: [{ message: 'Missing required field' }],
    });

    await expect(
      service.deleteProduct('hotel-id', 'catalog-a', 'product-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
