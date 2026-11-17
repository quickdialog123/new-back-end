import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '@quickdialog/common/decorators/roles.decorator.js';
import { CatalogProductsController } from '@quickdialog/whatsapp/catalog/catalog.controller.js';
import { CatalogProductsService } from '@quickdialog/whatsapp/catalog/catalog.service.js';

describe('CatalogController', () => {
  let controller: CatalogProductsController;
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
      controllers: [CatalogProductsController],
      providers: [{ provide: CatalogProductsService, useValue: catalogService }],
    }).compile();
    controller = moduleRef.get(CatalogProductsController);
  });

  it('derives the hotel context from the authenticated owner for catalog listing', async () => {
    catalogService.listCatalogs.mockResolvedValue([]);
    await expect(controller.listCatalogs(owner as never)).resolves.toEqual([]);
    expect(catalogService.listCatalogs).toHaveBeenCalledWith('hotel-id');
  });

  it('restricts catalog endpoints to hotel owners', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CatalogProductsController)).toEqual([
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
});
