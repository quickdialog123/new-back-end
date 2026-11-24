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

  it('finds a campaign within the authenticated hotel and rejects missing campaigns', async () => {
    const campaign = { id: 'campaign-1', hotelId: 'hotel-1', guests: [] };
    const findFirst = vi.fn().mockResolvedValueOnce(campaign).mockResolvedValueOnce(null);
    const service = new BroadcastCampaignsService(
      { broadcastCampaign: { findFirst } } as never,
      {} as never,
      {} as never,
    );

    await expect(service.findOne('hotel-1', 'campaign-1')).resolves.toBe(campaign);
    await expect(service.findOne('hotel-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { id: 'campaign-1', hotelId: 'hotel-1' } }),
    );
  });

  it('updates draft campaign fields and guest selection transactionally', async () => {
    const updated = { id: 'campaign-1', name: 'Updated', guests: [] };
    const tx = {
      broadcastCampaign: {
        findFirst: vi.fn().mockResolvedValueOnce({ id: 'campaign-1', status: 'DRAFT' }).mockResolvedValueOnce(updated),
        update: vi.fn().mockResolvedValue(undefined),
      },
      broadcastCampaignGuest: {
        deleteMany: vi.fn().mockResolvedValue(undefined),
        createMany: vi.fn().mockResolvedValue(undefined),
      },
    };
    const count = vi.fn().mockResolvedValue(2);
    const transaction = vi.fn((callback: (client: typeof tx) => unknown) => callback(tx));
    const service = new BroadcastCampaignsService(
      { guest: { count }, $transaction: transaction } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.update('hotel-1', 'campaign-1', {
        name: 'Updated',
        guestIds: ['guest-1', 'guest-2'],
      }),
    ).resolves.toBe(updated);

    expect(count).toHaveBeenCalledWith({
      where: { hotelId: 'hotel-1', id: { in: ['guest-1', 'guest-2'] } },
    });
    expect(tx.broadcastCampaignGuest.deleteMany).toHaveBeenCalledWith({
      where: { campaignId: 'campaign-1' },
    });
    expect(tx.broadcastCampaignGuest.createMany).toHaveBeenCalledWith({
      data: [
        { campaignId: 'campaign-1', guestId: 'guest-1' },
        { campaignId: 'campaign-1', guestId: 'guest-2' },
      ],
    });
    expect(tx.broadcastCampaign.update).toHaveBeenCalledWith({
      where: { id: 'campaign-1' },
      data: { name: 'Updated' },
    });
  });

  it('rejects updates when the campaign is missing or is no longer a draft', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'campaign-1', status: 'SENDING' });
    const transaction = vi.fn((callback: (client: unknown) => unknown) =>
      callback({ broadcastCampaign: { findFirst } }),
    );
    const service = new BroadcastCampaignsService(
      { $transaction: transaction } as never,
      {} as never,
      {} as never,
    );

    await expect(service.update('hotel-1', 'missing', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update('hotel-1', 'campaign-1', {}),
    ).rejects.toThrow('Only draft campaigns can be updated');
  });

  it('removes only draft campaigns and rejects missing or changed campaigns', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: 'SENDING' })
      .mockResolvedValueOnce({ status: 'DRAFT' })
      .mockResolvedValueOnce({ status: 'DRAFT' });
    const deleteMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    const service = new BroadcastCampaignsService(
      { broadcastCampaign: { findFirst, deleteMany } } as never,
      {} as never,
      {} as never,
    );

    await expect(service.remove('hotel-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove('hotel-1', 'sending')).rejects.toThrow(
      'Only draft campaigns can be deleted',
    );
    await expect(service.remove('hotel-1', 'changed')).rejects.toThrow(
      'Campaign status changed and it can no longer be deleted',
    );
    await expect(service.remove('hotel-1', 'draft')).resolves.toBeUndefined();
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
    const meta = {
      findTemplate: vi.fn().mockResolvedValue({
        data: [
          {
            name: 'summer_offer',
            language: 'en_US',
            status: 'APPROVED',
          },
        ],
      }),
      sendTemplateMessage: vi.fn().mockResolvedValue('wamid-1'),
    };
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
    await vi.waitFor(() => {
      expect(guestUpdate).toHaveBeenCalledWith({
        where: {
          campaignId_guestId: { campaignId: 'campaign-1', guestId: 'guest-1' },
        },
        data: { messageId: 'wamid-1', status: 'PENDING' },
      });
    });
  });
});
