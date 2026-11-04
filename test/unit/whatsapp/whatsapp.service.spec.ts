import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';
import { encryptMetaToken } from '@quickdialog/whatsapp/meta/meta-token.util.js';
import { WhatsappService } from '@quickdialog/whatsapp/whatsapp.service.js';

describe('WhatsappService', () => {
  let service: WhatsappService;

  const findFirst = vi.fn();
  const updateMany = vi.fn();
  const update = vi.fn();
  const meta = {
    registerPhoneNumber: vi.fn(),
  };
  const config = { getOrThrow: vi.fn() };
  const encryptionKey = Buffer.alloc(32, 1).toString('base64');
  const encryptedToken = encryptMetaToken('meta-token', encryptionKey);
  const account = {
    id: 'account-id',
    hotelId: 'hotel-id',
    wabaId: 'waba-id',
    phoneNumberId: 'phone-id',
    accessTokenEncrypted: encryptedToken,
    status: 'UNVERIFIED',
    displayPhoneNumber: '+15551234567',
    verifiedName: 'QuickDialog Hotel',
    connectedAt: null,
  };
  let persistedAccount: typeof account;

  const prisma = {
    whatsAppAccount: {
      findFirst,
      updateMany,
      update,
    },
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    updateMany.mockResolvedValue({ count: 0 });
    persistedAccount = { ...account };
    findFirst.mockImplementation(() => Promise.resolve(persistedAccount));
    update.mockImplementation(({ data }) => {
      persistedAccount = { ...persistedAccount, ...data };
      return Promise.resolve(persistedAccount);
    });
    meta.registerPhoneNumber.mockResolvedValue(undefined);
    config.getOrThrow.mockReturnValue(encryptionKey);

    const moduleRef = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: PrismaService, useValue: prisma },
        { provide: MetaGraphClient, useValue: meta },
        { provide: ConfigService, useValue: config },
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

    expect(findFirst).toHaveBeenCalledWith({
      where: { hotelId: 'hotel-id' },
      orderBy: { updatedAt: 'desc' },
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

  it('returns not_connected for a disconnected account', async () => {
    findFirst.mockResolvedValue({
      status: 'NOT_CONNECTED',
      wabaId: 'waba-id',
    });

    await expect(service.getStatus('hotel-id')).resolves.toMatchObject({
      status: 'not_connected',
      wabaId: null,
      phoneNumber: null,
    });
  });

  it('reports an unverified account without claiming it is connected', async () => {
    findFirst.mockResolvedValue(account);

    await expect(service.getStatus('hotel-id')).resolves.toMatchObject({
      status: 'unverified',
      phoneNumber: '+15551234567',
      connectedAt: null,
    });
  });

  it('registers an unverified number with Meta before marking it connected', async () => {
    persistedAccount = { ...account, status: 'UNVERIFIED' };
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(
      service.registerPhoneNumber('hotel-id', '654321'),
    ).resolves.toMatchObject({
      status: 'connected',
      connectedAt: expect.any(String),
    });

    expect(meta.registerPhoneNumber).toHaveBeenCalledWith(
      'phone-id',
      'meta-token',
      '654321',
    );
    expect(log).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: 'account-id' },
      data: {
        status: 'CONNECTED',
        connectedAt: expect.any(Date),
      },
    });
  });

  it('does not register a number that is already connected', async () => {
    persistedAccount = { ...account, status: 'CONNECTED' };

    await expect(
      service.registerPhoneNumber('hotel-id', '654321'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(meta.registerPhoneNumber).not.toHaveBeenCalled();
  });

  it('treats an unknown account status as not connected', async () => {
    findFirst.mockResolvedValue({
      status: 'UNKNOWN',
      wabaId: 'waba-id',
      displayPhoneNumber: null,
      verifiedName: null,
      connectedAt: new Date('2026-10-28T12:00:00.000Z'),
    });

    await expect(service.getStatus('hotel-id')).resolves.toMatchObject({
      status: 'not_connected',
    });
  });

  it('disconnects by wiping encrypted tokens while retaining accounts', async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await expect(service.disconnect('hotel-id')).resolves.toMatchObject({
      status: 'not_connected',
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        hotelId: 'hotel-id',
        status: { not: 'NOT_CONNECTED' },
      },
      data: {
        status: 'NOT_CONNECTED',
        accessTokenEncrypted: null,
      },
    });
  });

  it('handles disconnect when no active account exists', async () => {
    updateMany.mockResolvedValue({ count: 0 });

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

    expect(updateMany).toHaveBeenCalledOnce();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
