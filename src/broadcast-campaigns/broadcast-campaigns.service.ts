import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpResponseError } from '@nestjs/http-client';

import { PrismaService } from '@quickdialog/database/prisma.service.js';
import {
  BroadcastCampaignStatus,
  BroadcastGuestStatus,
} from '@quickdialog/generated/prisma/client.js';
import { decryptMetaToken } from '@quickdialog/whatsapp/meta/meta-token.util.js';
import { MetaGraphClient } from '@quickdialog/whatsapp/meta/meta-graph.client.js';
import type {
  CreateBroadcastCampaignDTO,
  UpdateBroadcastCampaignDTO,
} from './schemas/broadcast-campaign.schema.js';

const campaignSelect = {
  id: true,
  hotelId: true,
  name: true,
  templateName: true,
  templateLanguage: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const campaignDetailInclude = {
  guests: {
    select: {
      status: true,
      guest: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          roomNumber: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class BroadcastCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly meta: MetaGraphClient,
  ) {}

  async create(hotelId: string, input: CreateBroadcastCampaignDTO) {
    const guestIds = [...new Set(input.guestIds ?? [])];

    await this.assertHotelGuests(hotelId, guestIds);

    return this.prisma.broadcastCampaign.create({
      data: {
        hotelId,
        name: input.name,
        templateName: input.templateName,
        templateLanguage: input.templateLanguage,
        status: BroadcastCampaignStatus.DRAFT,
        guests: {
          create: guestIds.map((guestId) => ({
            guest: { connect: { id: guestId } },
          })),
        },
      },
      include: campaignDetailInclude,
    });
  }

  async findAll(hotelId: string) {
    const campaigns = await this.prisma.broadcastCampaign.findMany({
      where: { hotelId },
      select: {
        ...campaignSelect,
        _count: { select: { guests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return campaigns.map(({ _count, ...campaign }) => ({
      ...campaign,
      guestCount: _count.guests,
    }));
  }

  async findOne(hotelId: string, id: string) {
    const campaign = await this.prisma.broadcastCampaign.findFirst({
      where: { id, hotelId },
      select: { ...campaignSelect, ...campaignDetailInclude },
    });
    if (!campaign) throw new NotFoundException('Broadcast campaign not found');
    return campaign;
  }

  async update(hotelId: string, id: string, input: UpdateBroadcastCampaignDTO) {
    const { guestIds, ...fields } = input;

    const uniqueGuestIds =
      guestIds === undefined ? undefined : [...new Set(guestIds)];

    if (uniqueGuestIds !== undefined) {
      await this.assertHotelGuests(hotelId, uniqueGuestIds);
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.broadcastCampaign.findFirst({
        where: { id, hotelId },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException('Broadcast campaign not found');
      }

      if (existing.status !== 'DRAFT') {
        throw new ConflictException('Only draft campaigns can be updated');
      }

      if (uniqueGuestIds !== undefined) {
        await tx.broadcastCampaignGuest.deleteMany({
          where: { campaignId: id },
        });

        if (uniqueGuestIds.length) {
          await tx.broadcastCampaignGuest.createMany({
            data: uniqueGuestIds.map((guestId) => ({
              campaignId: id,
              guestId,
            })),
          });
        }
      }

      if (Object.keys(fields).length) {
        await tx.broadcastCampaign.update({
          where: { id },
          data: fields,
        });
      }

      return tx.broadcastCampaign.findFirst({
        where: { id, hotelId },
        select: {
          ...campaignSelect,
          ...campaignDetailInclude,
        },
      });
    });
  }

  async remove(hotelId: string, id: string) {
    const campaign = await this.prisma.broadcastCampaign.findFirst({
      where: { id, hotelId },
      select: { status: true },
    });

    if (!campaign) {
      throw new NotFoundException('Broadcast campaign not found');
    }

    if (campaign.status !== 'DRAFT') {
      throw new ConflictException('Only draft campaigns can be deleted');
    }

    const result = await this.prisma.broadcastCampaign.deleteMany({
      where: {
        id,
        hotelId,
        status: 'DRAFT',
      },
    });

    if (!result.count) {
      throw new ConflictException(
        'Campaign status changed and it can no longer be deleted',
      );
    }
  }

  async preview(hotelId: string, id: string) {
    const campaign = await this.findOne(hotelId, id);

    const account = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: 'CONNECTED',
        accessTokenEncrypted: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: { wabaId: true, accessTokenEncrypted: true },
    });

    if (!account?.accessTokenEncrypted) {
      throw new ConflictException('Connected WhatsApp account is required');
    }

    const tokenKey = this.config.getOrThrow<string>('meta.tokenEncryptionKey');

    const token = decryptMetaToken(account.accessTokenEncrypted, tokenKey);

    // Find the selected template directly
    const result = await this.meta.findTemplate(
      account.wabaId,
      token,
      campaign.templateName,
      campaign.templateLanguage,
    );

    const template = result.data?.find(
      (item) =>
        item.name === campaign.templateName &&
        item.language === campaign.templateLanguage &&
        item.status === 'APPROVED',
    );

    if (!template) {
      throw new NotFoundException('Approved WhatsApp template not found');
    }

    return {
      campaignId: campaign.id,
      template: {
        id: template.id,
        name: template.name,
        language: template.language,
        category: template.category,
        status: template.status,
        components: template.components,
      },
    };
  }

  async start(hotelId: string, id: string) {
    const campaign = await this.findOne(hotelId, id);

    if (campaign.status !== BroadcastCampaignStatus.DRAFT) {
      throw new ConflictException('Only draft campaigns can be started');
    }

    const account = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: 'CONNECTED',
        accessTokenEncrypted: { not: null },
      },
      select: {
        phoneNumberId: true,
        accessTokenEncrypted: true,
      },
    });

    if (!account?.accessTokenEncrypted) {
      throw new ConflictException('WhatsApp account not connected');
    }

    const tokenKey = this.config.getOrThrow<string>('meta.tokenEncryptionKey');

    const token = decryptMetaToken(account.accessTokenEncrypted, tokenKey);

    const result = await this.prisma.broadcastCampaign.updateMany({
      where: {
        id,
        hotelId,
        status: BroadcastCampaignStatus.DRAFT,
      },
      data: {
        status: BroadcastCampaignStatus.SENDING,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException('Campaign already started');
    }

    const successful: { guestId: string; messageId: string }[] = [];
    const failed: string[] = [];
    const uncertain: string[] = [];

    for (const recipient of campaign.guests) {
      try {
        const messageId = await this.meta.sendTemplateMessage(
          account.phoneNumberId,
          token,
          recipient.guest.phoneNumber,
          campaign.templateName,
          campaign.templateLanguage,
        );

        successful.push({
          guestId: recipient.guest.id,
          messageId,
        });
      } catch (error) {
        if (error instanceof HttpResponseError && error.status < 500) {
          failed.push(recipient.guest.id);
        } else {
          uncertain.push(recipient.guest.id);
        }
      }
    }

    const updates = [
      ...successful.map(({ guestId, messageId }) =>
        this.prisma.broadcastCampaignGuest.update({
          where: {
            campaignId_guestId: {
              campaignId: id,
              guestId,
            },
          },
          data: { messageId },
        }),
      ),

      ...failed.map((guestId) =>
        this.prisma.broadcastCampaignGuest.update({
          where: {
            campaignId_guestId: {
              campaignId: id,
              guestId,
            },
          },
          data: {
            status: BroadcastGuestStatus.FAILED,
          },
        }),
      ),
    ];

    if (updates.length) await this.prisma.$transaction(updates);

    return {
      campaignId: id,
      accepted: successful.length,
      failed: failed.length,
      uncertain: uncertain.length,
    };
  }

  private async assertHotelGuests(
    hotelId: string,
    guestIds: string[],
  ): Promise<void> {
    const uniqueIds = [...new Set(guestIds)];

    if (!uniqueIds.length) return;

    const count = await this.prisma.guest.count({
      where: {
        hotelId,
        id: { in: uniqueIds },
      },
    });

    if (count !== uniqueIds.length) {
      throw new NotFoundException(
        'One or more guests were not found for this hotel',
      );
    }
  }
}
