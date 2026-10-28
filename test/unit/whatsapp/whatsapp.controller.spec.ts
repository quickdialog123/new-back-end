import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES_KEY } from '@quickdialog/common/decorators/roles.decorator.js';
import { WhatsappController } from '@quickdialog/whatsapp/whatsapp.controller.js';
import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';
import { WhatsappService } from '@quickdialog/whatsapp/whatsapp.service.js';

describe('WhatsappController', () => {
  let controller: WhatsappController;
  const whatsappService = { getStatus: vi.fn(), disconnect: vi.fn() };
  const user = {
    userId: 'user-id',
    sessionId: 'session-id',
    hotelId: 'hotel-id',
    role: 'OWNER',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        { provide: WhatsappService, useValue: whatsappService },
        { provide: MetaGraphClient, useValue: {} },
      ],
    }).compile();
    controller = moduleRef.get(WhatsappController);
  });

  it('uses the authenticated hotel for status and disconnect', async () => {
    whatsappService.getStatus.mockResolvedValue({ status: 'connected' });
    whatsappService.disconnect.mockResolvedValue({ status: 'not_connected' });

    await expect(controller.getStatus(user as never)).resolves.toEqual({
      status: 'connected',
    });
    await expect(controller.disconnect(user as never)).resolves.toEqual({
      status: 'not_connected',
    });
    expect(whatsappService.getStatus).toHaveBeenCalledWith('hotel-id');
    expect(whatsappService.disconnect).toHaveBeenCalledWith('hotel-id');
  });

  it('restricts status and disconnect to hotel owners', () => {
    const status = Object.getOwnPropertyDescriptor(
      WhatsappController.prototype,
      'getStatus',
    )?.value;
    const disconnect = Object.getOwnPropertyDescriptor(
      WhatsappController.prototype,
      'disconnect',
    )?.value;

    expect(Reflect.getMetadata(ROLES_KEY, status)).toEqual(['OWNER']);
    expect(Reflect.getMetadata(ROLES_KEY, disconnect)).toEqual(['OWNER']);
  });
});
