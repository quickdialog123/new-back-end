import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { WhatsappService } from '@quickdialog/whatsapp/whatsapp.service.js';

describe('WhatsappService', () => {
  let service: WhatsappService;
  const findFirst = vi.fn();
  const update = vi.fn();
  const prisma = { whatsAppAccount: { findFirst, update } };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(WhatsappService);
  });

  it('returns frontend-safe connected status from persisted data', async () => {
    findFirst.mockResolvedValue({
      status: 'CONNECTED',
      wabaId: 'waba-id',
      displayPhoneNumber: '+15551234567',
      verifiedName: 'QuickDialog Hotel',
      connectedAt: new Date('2026-10-28T12:00:00.000Z'),
    });

    await expect(service.getStatus('hotel-id')).resolves.toEqual({
      status: 'connected',
      wabaId: 'waba-id',
      phoneNumber: '+15551234567',
      displayName: 'QuickDialog Hotel',
      wabaStatus: null,
      qualityRating: null,
      connectedAt: '2026-10-28T12:00:00.000Z',
      errorMessage: null,
    });
  });

  it('returns not_connected without an account', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.getStatus('hotel-id')).resolves.toEqual({
      status: 'not_connected',
      wabaId: null,
      phoneNumber: null,
      displayName: null,
      wabaStatus: null,
      qualityRating: null,
      connectedAt: null,
      errorMessage: null,
    });
  });

  it('maps an unexpected active account status to error', async () => {
    findFirst.mockResolvedValue({
      status: 'ERROR',
      wabaId: 'waba-id',
      displayPhoneNumber: null,
      verifiedName: null,
      connectedAt: new Date('2026-10-28T12:00:00.000Z'),
    });

    await expect(service.getStatus('hotel-id')).resolves.toMatchObject({
      status: 'error',
      wabaId: 'waba-id',
    });
  });

  it('disconnects by wiping the encrypted token while retaining the account', async () => {
    findFirst.mockResolvedValue({ id: 'account-id' });

    await expect(service.disconnect('hotel-id')).resolves.toEqual({
      status: 'not_connected',
      wabaId: null,
      phoneNumber: null,
      displayName: null,
      wabaStatus: null,
      qualityRating: null,
      connectedAt: null,
      errorMessage: null,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'account-id' },
      data: { status: 'DISCONNECTED', accessTokenEncrypted: null },
    });
  });

  it('does not update when there is no active account to disconnect', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.disconnect('hotel-id')).resolves.toEqual({
      status: 'not_connected',
      wabaId: null,
      phoneNumber: null,
      displayName: null,
      wabaStatus: null,
      qualityRating: null,
      connectedAt: null,
      errorMessage: null,
    });
    expect(update).not.toHaveBeenCalled();
  });
});
