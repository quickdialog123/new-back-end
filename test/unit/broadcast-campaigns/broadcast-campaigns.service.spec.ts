import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { encryptMetaToken } from '@quickdialog/whatsapp/meta/meta-token.util.js';
import { BroadcastCampaignsService } from '@quickdialog/broadcast-campaigns/broadcast-campaigns.service.js';

describe('BroadcastCampaignsService', () => {
  it('creates a campaign with nullable delivery status and message ID', async () => {
    const created = { id: 'campaign-id', hotelId: 'hotel-1' };
    const guestCount = vi.fn().mockResolvedValue(1);
    const campaignCreate = vi.fn().mockResolvedValue(created);
    const prisma = {
      guest: { count: guestCount },
      broadcastCampaign: { create: campaignCreate },
    };
    const service = new BroadcastCampaignsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create('hotel-1', {
        name: 'Summer offer',
        templateName: 'summer_offer',
        templateLanguage: 'en_US',
        guestIds: ['guest-1'],
      }),
    ).resolves.toBe(created);

    expect(guestCount).toHaveBeenCalledWith({
      where: { hotelId: 'hotel-1', id: { in: ['guest-1'] } },
    });
    expect(campaignCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hotelId: 'hotel-1',
          guests: {
            create: [
              {
                guest: { connect: { id: 'guest-1' } },
              },
            ],
          },
        }),
      }),
    );
  });

  it('does not create a campaign with a guest belonging to another hotel', async () => {
    const campaignCreate = vi.fn();
    const prisma = {
      guest: { count: vi.fn().mockResolvedValue(0) },
      broadcastCampaign: { create: campaignCreate },
    };
    const service = new BroadcastCampaignsService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create('hotel-1', {
        name: 'Summer offer',
        templateName: 'summer_offer',
        templateLanguage: 'en_US',
        guestIds: ['guest-from-another-hotel'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(campaignCreate).not.toHaveBeenCalled();
  });

  it('lists only campaigns belonging to the authenticated hotel', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([{ id: 'campaign-1', _count: { guests: 3 } }]);
    const service = new BroadcastCampaignsService(
      { broadcastCampaign: { findMany } } as never,
      {} as never,
      {} as never,
    );

    await expect(service.findAll('hotel-1')).resolves.toEqual([
      { id: 'campaign-1', guestCount: 3 },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hotelId: 'hotel-1' } }),
    );
  });

  it('starts a draft campaign using each selected guest ID and the existing Meta sender', async () => {
    const key = Buffer.alloc(32, 4).toString('base64');
    const campaign = {
      id: 'campaign-1',
      hotelId: 'hotel-1',
      status: 'DRAFT',
      templateName: 'summer_offer',
      templateLanguage: 'en_US',
      guests: [
        {
          status: null,
          guest: { id: 'guest-1', phoneNumber: '+15550102000' },
        },
      ],
    };
    const guestUpdate = vi.fn().mockResolvedValue({});
    const prisma = {
      broadcastCampaign: {
        findFirst: vi.fn().mockResolvedValue(campaign),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      broadcastCampaignGuest: { update: guestUpdate },
      whatsAppAccount: {
        findFirst: vi.fn().mockResolvedValue({
          phoneNumberId: 'phone-id',
          accessTokenEncrypted: encryptMetaToken('access-token', key),
        }),
      },
      $transaction: vi.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    const meta = { sendTemplateMessage: vi.fn().mockResolvedValue('wamid-1') };
    const config = { getOrThrow: vi.fn().mockReturnValue(key) };
    const service = new BroadcastCampaignsService(
      prisma as never,
      config as never,
      meta as never,
    );

    await service.start('hotel-1', 'campaign-1');

    expect(meta.sendTemplateMessage).toHaveBeenCalledWith(
      'phone-id',
      'access-token',
      '+15550102000',
      'summer_offer',
      'en_US',
    );
    expect(guestUpdate).toHaveBeenCalledWith({
      where: {
        campaignId_guestId: { campaignId: 'campaign-1', guestId: 'guest-1' },
      },
      data: { messageId: 'wamid-1' },
    });
  });
});
