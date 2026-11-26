import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '@quickdialog/common/decorators/roles.decorator.js';
import { CatalogController } from '@quickdialog/whatsapp/catalog/catalog.controller.js';
import { CatalogService } from '@quickdialog/whatsapp/catalog/catalog.service.js';

describe('CatalogController', () => {
  let controller: CatalogController;
  const catalogService = {
    listCatalogs: vi.fn(),
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    getBatchStatus: vi.fn(),
    connectCatalog: vi.fn(),
    disconnectCatalog: vi.fn(),
    getConnection: vi.fn(),
    getAvailableCatalogs: vi.fn(),
    updateSettings: vi.fn(),
  };
  const owner = {
    userId: 'user-id',
    sessionId: 'session-id',
    hotelId: 'hotel-id',
    role: 'OWNER',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [{ provide: CatalogService, useValue: catalogService }],
    }).compile();
    controller = moduleRef.get(CatalogController);
  });

  it('derives the hotel context from the authenticated owner for catalog listing', async () => {
    catalogService.listCatalogs.mockResolvedValue([]);
    await expect(controller.listCatalogs(owner as never)).resolves.toEqual([]);
    expect(catalogService.listCatalogs).toHaveBeenCalledWith('hotel-id');
  });

  it('restricts catalog endpoints to hotel owners', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CatalogController)).toEqual([
      'OWNER',
    ]);
  });

  it('delegates catalog connection operations using the authenticated hotel', async () => {
    const settings = { catalogVisible: true };
    catalogService.connectCatalog.mockResolvedValue({ status: 'connected' });
    catalogService.disconnectCatalog.mockResolvedValue({
      status: 'not_connected',
    });
    catalogService.getConnection.mockResolvedValue({ status: 'connected' });
    catalogService.getAvailableCatalogs.mockResolvedValue([]);
    catalogService.updateSettings.mockResolvedValue({ status: 'hidden' });

    await expect(
      controller.connectCatalog(owner as never, { catalogId: 'catalog-id' }),
    ).resolves.toEqual({ status: 'connected' });
    await expect(controller.disconnectCatalog(owner as never)).resolves.toEqual(
      { status: 'not_connected' },
    );
    await expect(controller.getConnection(owner as never)).resolves.toEqual({
      status: 'connected',
    });
    await expect(
      controller.getAvailableCatalogs(owner as never),
    ).resolves.toEqual([]);
    await expect(
      controller.updateSettings(owner as never, settings),
    ).resolves.toEqual({ status: 'hidden' });

    expect(catalogService.connectCatalog).toHaveBeenCalledWith(
      'hotel-id',
      'catalog-id',
    );
    expect(catalogService.disconnectCatalog).toHaveBeenCalledWith('hotel-id');
    expect(catalogService.getConnection).toHaveBeenCalledWith('hotel-id');
    expect(catalogService.getAvailableCatalogs).toHaveBeenCalledWith(
      'hotel-id',
    );
    expect(catalogService.updateSettings).toHaveBeenCalledWith(
      'hotel-id',
      settings,
    );
  });

  it('delegates product and operation requests with their route parameters', async () => {
    const catalog = { catalogId: 'catalog-id' };
    const product = { productId: 'product-id', catalogId: 'catalog-id' };
    const createInput = { name: 'Product' };
    const updateInput = { name: 'Updated product' };
    const query = { after: 'cursor-1' };

    await controller.listProducts(owner as never, catalog, query as never);
    await controller.createProduct(owner as never, catalog, createInput as never);
    await controller.updateProduct(owner as never, product, updateInput as never);
    await controller.deleteProduct(owner as never, product);
    await controller.getOperationStatus(
      owner as never,
      { ...catalog, handle: 'handle-1' },
    );

    expect(catalogService.listProducts).toHaveBeenCalledWith(
      'hotel-id',
      'catalog-id',
      'cursor-1',
    );
    expect(catalogService.createProduct).toHaveBeenCalledWith(
      'hotel-id',
      'catalog-id',
      createInput,
    );
    expect(catalogService.updateProduct).toHaveBeenCalledWith(
      'hotel-id',
      'catalog-id',
      'product-id',
      updateInput,
    );
    expect(catalogService.deleteProduct).toHaveBeenCalledWith(
      'hotel-id',
      'catalog-id',
      'product-id',
    );
    expect(catalogService.getBatchStatus).toHaveBeenCalledWith(
      'hotel-id',
      'catalog-id',
      'handle-1',
    );
  });
});
