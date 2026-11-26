import {
  BadRequestException,
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
  productRetailerIds: true,
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
    const guestIds = input.guestIds ?? [];

    await this.assertHotelGuests(hotelId, guestIds);

    return this.prisma.broadcastCampaign.create({
      data: {
        hotelId,
        name: input.name,
        templateName: input.templateName,
        templateLanguage: input.templateLanguage,
        productRetailerIds: input.productRetailerIds ?? [],
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
      productCount: campaign.productRetailerIds.length,
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

    if (guestIds !== undefined) {
      await this.assertHotelGuests(hotelId, guestIds);
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

      if (guestIds !== undefined) {
        await tx.broadcastCampaignGuest.deleteMany({
          where: { campaignId: id },
        });

        if (guestIds.length) {
          await tx.broadcastCampaignGuest.createMany({
            data: guestIds.map((guestId) => ({
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

    const account = await this.getConnectedWhatsAppAccount(hotelId, true);

    // Find the selected template directly
    const result = await this.meta.findTemplate(
      account.wabaId,
      account.token,
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

    if (!campaign.guests.length) {
      throw new BadRequestException('Campaign must have at least one guest');
    }

    const account = await this.getConnectedWhatsAppAccount(hotelId);

    const isValid = await this.meta.findTemplate(
      account.wabaId,
      account.token,
      campaign.templateName,
      campaign.templateLanguage,
    );

    const template = isValid.data?.find(
      (item) =>
        item.name === campaign.templateName &&
        item.language === campaign.templateLanguage &&
        item.status === 'APPROVED',
    );

    if (!template) {
      throw new NotFoundException('Approved WhatsApp template not found');
    }

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

    // Fire-and-forget
    void this.processCampaign(campaign, account).catch((error) => {
      console.error(`Campaign ${id} processing failed:`, error);
    });

    return {
      campaignId: id,
      status: BroadcastCampaignStatus.SENDING,
    };
  }
  private async assertHotelGuests(
    hotelId: string,
    guestIds: string[],
  ): Promise<void> {
    if (!guestIds.length) return;

    const count = await this.prisma.guest.count({
      where: {
        hotelId,
        id: { in: guestIds },
      },
    });

    if (count !== guestIds.length) {
      throw new NotFoundException(
        'One or more guests were not found for this hotel',
      );
    }
  }

  private async getConnectedWhatsAppAccount(
    hotelId: string,
    newestFirst = false,
  ) {
    const account = await this.prisma.whatsAppAccount.findFirst({
      where: {
        hotelId,
        status: 'CONNECTED',
        accessTokenEncrypted: { not: null },
      },
      ...(newestFirst ? { orderBy: { updatedAt: 'desc' as const } } : {}),
      select: {
        wabaId: true,
        phoneNumberId: true,
        accessTokenEncrypted: true,
      },
    });

    if (!account) {
      throw new NotFoundException(
        'No connected WhatsApp account found for this hotel',
      );
    }

    if (!account.accessTokenEncrypted) {
      throw new NotFoundException(
        'No connected WhatsApp account with a valid access token found for this hotel',
      );
    }

    const tokenKey = this.config.getOrThrow<string>('meta.tokenEncryptionKey');
    return {
      ...account,
      token: decryptMetaToken(account.accessTokenEncrypted, tokenKey),
    };
  }

  private async processCampaign(
    campaign: Awaited<ReturnType<BroadcastCampaignsService['findOne']>>,
    account: Awaited<
      ReturnType<BroadcastCampaignsService['getConnectedWhatsAppAccount']>
    >,
  ) {
    const batchSize = 10;

    const successful: { guestId: string; messageId: string }[] = [];
    const failed: string[] = [];
    const uncertain: string[] = [];

    for (let i = 0; i < campaign.guests.length; i += batchSize) {
      const batch = campaign.guests.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (recipient) => {
          const messageId = await this.meta.sendTemplateMessage(
            account.phoneNumberId,
            account.token,
            recipient.guest.phoneNumber,
            campaign.templateName,
            campaign.templateLanguage,
          );

          return {
            guestId: recipient.guest.id,
            messageId,
          };
        }),
      );

      const updates = [];

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const guestId = batch[j].guest.id;

        if (result.status === 'fulfilled') {
          successful.push(result.value);

          updates.push(
            this.prisma.broadcastCampaignGuest.update({
              where: {
                campaignId_guestId: {
                  campaignId: campaign.id,
                  guestId,
                },
              },
              data: {
                messageId: result.value.messageId,
                status: BroadcastGuestStatus.PENDING,
              },
            }),
          );
        } else {
          const error: unknown = result.reason;

          if (
            error instanceof HttpResponseError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            failed.push(guestId);

            updates.push(
              this.prisma.broadcastCampaignGuest.update({
                where: {
                  campaignId_guestId: {
                    campaignId: campaign.id,
                    guestId,
                  },
                },
                data: {
                  status: BroadcastGuestStatus.FAILED,
                },
              }),
            );
          } else {
            uncertain.push(guestId);
          }
        }
      }

      if (updates.length) {
        await this.prisma.$transaction(updates);
      }
    }

    return {
      campaignId: campaign.id,
      accepted: successful.length,
      failed: failed.length,
      uncertain: uncertain.length,
    };
  }
}
