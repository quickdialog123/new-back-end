import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HotelsController } from '@quickdialog/hotels/hotels.controller.js';
import { HotelsService } from '@quickdialog/hotels/hotels.service.js';
import { ROLES_KEY } from '@quickdialog/common/decorators/roles.decorator.js';

describe('HotelsController', () => {
  let controller: HotelsController;
  const hotelsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [HotelsController],
      providers: [{ provide: HotelsService, useValue: hotelsService }],
    }).compile();
    controller = moduleRef.get(HotelsController);
  });

  it('delegates create, read, update, and deactivate requests', async () => {
    const input = { name: 'Grand Hotel' };
    hotelsService.create.mockResolvedValue(input);
    hotelsService.findAll.mockResolvedValue([input]);
    hotelsService.findOne.mockResolvedValue(input);
    hotelsService.update.mockResolvedValue(input);
    hotelsService.deactivate.mockResolvedValue(input);

    await expect(controller.create(input as never)).resolves.toEqual(input);
    await expect(controller.findAll()).resolves.toEqual([input]);
    await expect(controller.findOne({ id: 'hotel-id' })).resolves.toEqual(
      input,
    );
    await expect(
      controller.update({ id: 'hotel-id' }, input as never),
    ).resolves.toEqual(input);
    await expect(controller.deactivate({ id: 'hotel-id' })).resolves.toEqual(
      input,
    );
  });

  it('restricts every route to super administrators', () => {
    expect(Reflect.getMetadata(ROLES_KEY, HotelsController)).toEqual([
      'SUPER_ADMIN',
    ]);
  });
});
