import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  const accountFindMany = vi.fn();
  const accountUpdate = vi.fn();
  const accountCreate = vi.fn();

  const prisma = {
    hotel: {
      findUnique: hotelFindUnique,
    },
    whatsAppAccount: {
      findFirst: accountFindFirst,
      findMany: accountFindMany,
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
    getOrThrow: vi.fn(),
  };

  const whatsappService = {
    getStatus: vi.fn(),
  };

  const input = {
    code: 'signup-code',
    wabaId: 'waba-id',
    phoneNumberId: 'phone-id',
  };

  const disconnectedAccount = {
    id: 'account-id',
    hotelId: 'hotel-id',
    wabaId: input.wabaId,
    phoneNumberId: input.phoneNumberId,
    status: 'DISCONNECTED',
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    hotelFindUnique.mockResolvedValue({ id: 'hotel-id' });
    accountFindFirst.mockResolvedValue(null);
    accountFindMany.mockResolvedValue([]);

    meta.exchangeCode.mockResolvedValue('raw-meta-token');
    meta.getClientBusinessId.mockResolvedValue('business-id');
    meta.getPhoneNumbers.mockResolvedValue([
      {
        id: input.phoneNumberId,
        display_phone_number: '+15551234567',
        verified_name: 'QuickDialog Hotel',
      },
    ]);
    meta.subscribeApp.mockResolvedValue(undefined);

    config.getOrThrow.mockReturnValue(Buffer.alloc(32).toString('base64'));

    accountUpdate.mockResolvedValue({ hotelId: 'hotel-id' });
    accountCreate.mockResolvedValue({ hotelId: 'hotel-id' });

    whatsappService.getStatus.mockResolvedValue({
      status: 'connected',
    });

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
    accountFindMany.mockResolvedValue([disconnectedAccount]);

    await expect(service.complete('hotel-id', input)).resolves.toEqual({
      status: 'connected',
    });

    expect(accountCreate).not.toHaveBeenCalled();

    expect(accountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-id' },
      data: expect.objectContaining({
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        businessId: 'business-id',
        status: 'CONNECTED',
        accessTokenEncrypted: expect.any(String),
      }),
    });

    const updateData = accountUpdate.mock.calls[0][0].data;

    expect(updateData).not.toHaveProperty('accessToken');
    expect(updateData.accessTokenEncrypted).not.toBe('raw-meta-token');

    expect(meta.subscribeApp).toHaveBeenCalledWith(
      input.wabaId,
      'raw-meta-token',
    );
  });

  it('rejects a missing hotel before calling Meta', async () => {
    hotelFindUnique.mockResolvedValue(null);

    await expect(
      service.complete('missing-hotel', input),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(meta.exchangeCode).not.toHaveBeenCalled();
    expect(accountCreate).not.toHaveBeenCalled();
  });

  it('requires disconnecting the active account before connecting again', async () => {
    accountFindFirst.mockResolvedValue({
      ...disconnectedAccount,
      status: 'CONNECTED',
    });

    await expect(service.complete('hotel-id', input)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(meta.exchangeCode).not.toHaveBeenCalled();
    expect(accountUpdate).not.toHaveBeenCalled();
    expect(accountCreate).not.toHaveBeenCalled();
  });

  it('rejects a phone number that does not belong to the selected WABA', async () => {
    meta.getPhoneNumbers.mockResolvedValue([]);

    await expect(service.complete('hotel-id', input)).rejects.toThrow(
      'Phone number does not belong to the selected WhatsApp account',
    );

    expect(accountFindMany).not.toHaveBeenCalled();
    expect(meta.subscribeApp).not.toHaveBeenCalled();
    expect(accountCreate).not.toHaveBeenCalled();
  });

  it('rejects a WhatsApp account linked to another hotel', async () => {
    accountFindMany.mockResolvedValue([
      {
        ...disconnectedAccount,
        hotelId: 'other-hotel-id',
        status: 'CONNECTED',
      },
    ]);

    await expect(service.complete('hotel-id', input)).rejects.toThrow(
      'This WhatsApp account is already linked to another hotel',
    );

    expect(meta.subscribeApp).not.toHaveBeenCalled();
    expect(accountUpdate).not.toHaveBeenCalled();
    expect(accountCreate).not.toHaveBeenCalled();
  });

  it('reconnects a disconnected phone under a different verified WABA', async () => {
    const newInput = {
      ...input,
      wabaId: 'new-waba-id',
    };

    accountFindMany.mockResolvedValue([
      {
        ...disconnectedAccount,
        wabaId: 'old-waba-id',
      },
    ]);

    await expect(service.complete('hotel-id', newInput)).resolves.toEqual({
      status: 'connected',
    });

    expect(meta.getPhoneNumbers).toHaveBeenCalledWith(
      'new-waba-id',
      'raw-meta-token',
    );

    expect(accountUpdate).toHaveBeenCalledWith({
      where: { id: 'account-id' },
      data: expect.objectContaining({
        wabaId: 'new-waba-id',
        phoneNumberId: 'phone-id',
        status: 'CONNECTED',
      }),
    });

    expect(accountCreate).not.toHaveBeenCalled();
  });

  it('creates a new account with only an encrypted token', async () => {
    await expect(service.complete('hotel-id', input)).resolves.toEqual({
      status: 'connected',
    });

    expect(accountUpdate).not.toHaveBeenCalled();

    expect(accountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hotelId: 'hotel-id',
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        businessId: 'business-id',
        status: 'CONNECTED',
        connectedAt: expect.any(Date),
        accessTokenEncrypted: expect.any(String),
      }),
    });

    const createData = accountCreate.mock.calls[0][0].data;

    expect(createData).not.toHaveProperty('accessToken');
    expect(createData.accessTokenEncrypted).not.toBe('raw-meta-token');

    expect(meta.subscribeApp).toHaveBeenCalledWith(
      input.wabaId,
      'raw-meta-token',
    );
  });

  it('rejects conflicting records for the same WABA and phone', async () => {
    accountFindMany.mockResolvedValue([
      {
        id: 'account-1',
        hotelId: 'hotel-id',
        wabaId: 'old-waba-id',
        phoneNumberId: 'phone-id',
        status: 'DISCONNECTED',
      },
      {
        id: 'account-2',
        hotelId: 'hotel-id',
        wabaId: 'waba-id',
        phoneNumberId: 'other-phone-id',
        status: 'DISCONNECTED',
      },
    ]);

    await expect(service.complete('hotel-id', input)).rejects.toThrow(
      'Conflicting WhatsApp account records',
    );

    expect(meta.subscribeApp).not.toHaveBeenCalled();
    expect(accountUpdate).not.toHaveBeenCalled();
    expect(accountCreate).not.toHaveBeenCalled();
  });

  it('does not persist credentials if Meta subscription fails', async () => {
    meta.subscribeApp.mockRejectedValue(new Error('Meta subscription failed'));

    await expect(service.complete('hotel-id', input)).rejects.toThrow(
      'Meta subscription failed',
    );

    expect(accountUpdate).not.toHaveBeenCalled();
    expect(accountCreate).not.toHaveBeenCalled();
  });
});
