import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '@quickdialog/common/decorators/roles.decorator.js';
import { CatalogConnectionController } from '@quickdialog/whatsapp/catalog/connection.controller.js';
import { CatalogConnectionService } from '@quickdialog/whatsapp/catalog/connection.service.js';

describe('CatalogConnectionController', () => {
  let controller: CatalogConnectionController;
  const catalogService = {
    connectCatalog: vi.fn(),
    disconnectCatalog: vi.fn(),
    getConnection: vi.fn(),
    getAvailableCatalogs: vi.fn(),
    updateSettings: vi.fn(),
  };
  const user = {
    userId: 'user-id',
    sessionId: 'session-id',
    hotelId: 'hotel-id',
    role: 'OWNER',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogConnectionController],
      providers: [{ provide: CatalogConnectionService, useValue: catalogService }],
    }).compile();
    controller = moduleRef.get(CatalogConnectionController);
  });

  it('delegates catalog operations using the authenticated hotel', async () => {
    const settings = { catalogVisible: true };
    catalogService.connectCatalog.mockResolvedValue({ status: 'connected' });
    catalogService.disconnectCatalog.mockResolvedValue({
      status: 'not_connected',
    });
    catalogService.getConnection.mockResolvedValue({ status: 'connected' });
    catalogService.getAvailableCatalogs.mockResolvedValue([]);
    catalogService.updateSettings.mockResolvedValue({ status: 'hidden' });

    await expect(
      controller.connectCatalog(user as never, { catalogId: 'catalog-id' }),
    ).resolves.toEqual({ status: 'connected' });
    await expect(controller.disconnectCatalog(user as never)).resolves.toEqual({
      status: 'not_connected',
    });
    await expect(controller.getConnection(user as never)).resolves.toEqual({
      status: 'connected',
    });
    await expect(
      controller.getAvailableCatalogs(user as never),
    ).resolves.toEqual([]);
    await expect(
      controller.updateSettings(user as never, settings),
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

  it('restricts every catalog operation to hotel owners', () => {
    for (const method of [
      'connectCatalog',
      'disconnectCatalog',
      'getConnection',
      'getAvailableCatalogs',
      'updateSettings',
    ] as const) {
      const handler = Object.getOwnPropertyDescriptor(
        CatalogConnectionController.prototype,
        method,
      )?.value;

      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['OWNER']);
    }
  });
});
