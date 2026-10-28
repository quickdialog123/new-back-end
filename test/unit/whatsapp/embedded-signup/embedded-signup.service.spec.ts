import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { EmbeddedSignupService } from '@quickdialog/whatsapp/embedded-signup/embedded-signup.service.js';
import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';
import { WhatsappService } from '@quickdialog/whatsapp/whatsapp.service.js';

describe('EmbeddedSignupService', () => {
  let service: EmbeddedSignupService;
  const hotelFindUnique = vi.fn();
  const accountFindFirst = vi.fn();
  const accountUpdate = vi.fn();
  const accountCreate = vi.fn();
  const prisma = {
    hotel: { findUnique: hotelFindUnique },
    whatsAppAccount: {
      findFirst: accountFindFirst,
      update: accountUpdate,
      create: accountCreate,
    },
  };
  const meta = {
    exchangeCode: vi.fn(),
    getClientBusinessId: vi.fn(),
    getPhoneNumbers: vi.fn(),
    subscribeApp: vi.fn(),
  };
  const config = {
    getOrThrow: vi.fn(() => Buffer.alloc(32).toString('base64')),
  };
  const whatsappService = { getStatus: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmbeddedSignupService,
        { provide: PrismaService, useValue: prisma },
        { provide: MetaGraphClient, useValue: meta },
        { provide: ConfigService, useValue: config },
        { provide: WhatsappService, useValue: whatsappService },
      ],
    }).compile();
    service = moduleRef.get(EmbeddedSignupService);
  });

  it('reuses a disconnected account and stores only an encrypted token', async () => {
    const input = {
      code: 'signup-code',
      wabaId: 'waba-id',
      phoneNumberId: 'phone-id',
    };
    hotelFindUnique.mockResolvedValue({ id: 'hotel-id' });
    accountFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'account-id',
      hotelId: 'hotel-id',
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      status: 'DISCONNECTED',
    });
    meta.exchangeCode.mockResolvedValue('raw-meta-token');
    meta.getClientBusinessId.mockResolvedValue('business-id');
    meta.getPhoneNumbers.mockResolvedValue([
      {
        id: input.phoneNumberId,
        display_phone_number: '+15551234567',
        verified_name: 'QuickDialog Hotel',
      },
    ]);
    accountUpdate.mockResolvedValue({ hotelId: 'hotel-id' });
    whatsappService.getStatus.mockResolvedValue({ status: 'connected' });

    await expect(service.complete('hotel-id', input)).resolves.toEqual({
      status: 'connected',
    });

    expect(accountCreate).not.toHaveBeenCalled();
    expect(accountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-id' },
      data: expect.objectContaining({
        status: 'CONNECTED',
        businessId: 'business-id',
        accessTokenEncrypted: expect.any(String),
        connectedAt: expect.any(Date),
      }),
    });
    const updateData = accountUpdate.mock.calls[0]?.[0].data;
    expect(updateData).not.toHaveProperty('accessToken');
    expect(updateData.accessTokenEncrypted).not.toBe('raw-meta-token');
    expect(meta.subscribeApp).toHaveBeenCalledWith(
      input.wabaId,
      'raw-meta-token',
    );
  });
});
