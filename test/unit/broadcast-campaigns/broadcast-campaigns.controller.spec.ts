import { Test } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '@quickdialog/common/decorators/roles.decorator.js';
import { BroadcastCampaignsController } from '@quickdialog/broadcast-campaigns/broadcast-campaigns.controller.js';
import { BroadcastCampaignsService } from '@quickdialog/broadcast-campaigns/broadcast-campaigns.service.js';

describe('BroadcastCampaignsController', () => {
  it('uses the authenticated hotel for campaign creation and listing', async () => {
    const service = {
      create: vi.fn().mockResolvedValue({ id: 'campaign-id' }),
      findAll: vi.fn().mockResolvedValue([]),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [BroadcastCampaignsController],
      providers: [{ provide: BroadcastCampaignsService, useValue: service }],
    }).compile();
    const controller = moduleRef.get(BroadcastCampaignsController);
    const user = { hotelId: 'hotel-1', role: 'OWNER' };
    const input = {
      name: 'Summer offer',
      templateName: 'summer_offer',
      templateLanguage: 'en_US',
      guestIds: [],
    };

    await expect(controller.create(user as never, input)).resolves.toEqual({
      id: 'campaign-id',
    });
    await expect(controller.findAll(user as never)).resolves.toEqual([]);

    expect(service.create).toHaveBeenCalledWith('hotel-1', input);
    expect(service.findAll).toHaveBeenCalledWith('hotel-1');
    expect(
      Reflect.getMetadata(ROLES_KEY, BroadcastCampaignsController),
    ).toEqual(['OWNER', 'STAFF']);
  });

  it('delegates campaign start using the authenticated hotel', async () => {
    const start = vi.fn().mockResolvedValue(null);
    const controller = new BroadcastCampaignsController({ start } as never);
    const user = { hotelId: 'hotel-1', role: 'OWNER' };
    const prototype = BroadcastCampaignsController.prototype;

    await expect(
      controller.start(user as never, { id: 'campaign-id' }),
    ).resolves.toBeNull();
    expect(start).toHaveBeenCalledWith('hotel-1', 'campaign-id');
    const startHandler = Object.getOwnPropertyDescriptor(
      prototype,
      'start',
    )?.value;
    expect(Reflect.getMetadata(PATH_METADATA, startHandler)).toBe(':id/start');
    expect(Reflect.getMetadata(METHOD_METADATA, startHandler)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, startHandler)).toBe(200);
  });
});
