import { BadRequestException } from '@nestjs/common';
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

  it('does not accept a missing hotel context', () => {
    expect(() =>
      controller.listCatalogs({ ...owner, hotelId: null } as never),
    ).toThrow(BadRequestException);
  });

  it('restricts catalog endpoints to hotel owners', () => {
    expect(Reflect.getMetadata(ROLES_KEY, CatalogProductsController)).toEqual([
      'OWNER',
    ]);
  });
});
