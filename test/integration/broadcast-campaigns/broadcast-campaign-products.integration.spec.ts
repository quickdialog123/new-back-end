import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { ConfigModule } from '@nestjs/config';
import configuration from '@quickdialog/config/configuration.js';
import { validateEnvironment } from '@quickdialog/config/env.schema.js';
import { DatabaseModule } from '@quickdialog/database/database.module.js';
import { PrismaService } from '@quickdialog/database/prisma.service.js';
import { BroadcastCampaignsService } from '@quickdialog/broadcast-campaigns/broadcast-campaigns.service.js';

describe('Broadcast campaign products integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let campaigns: BroadcastCampaignsService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: validateEnvironment,
        }),
        DatabaseModule,
      ],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    campaigns = new BroadcastCampaignsService(prisma, {} as never, {} as never);
  });

  afterEach(async () => {
    if (prisma) {
      await prisma.hotel.deleteMany({
        where: { token: { startsWith: 'campaign-products-' } },
      });
    }
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('persists and replaces the ordered retailer ID array on a campaign', async () => {
    const hotel = await prisma.hotel.create({
      data: {
        name: 'Campaign Products Hotel',
        phoneNumber: '+15550000100',
        token: `campaign-products-${crypto.randomUUID()}`,
      },
    });

    const created = await campaigns.create(hotel.id, {
      name: 'Catalog offer',
      templateName: 'catalog_offer',
      templateLanguage: 'en_US',
      productRetailerIds: ['retailer-b', 'retailer-a'],
    });

    expect(created.productRetailerIds).toEqual(['retailer-b', 'retailer-a']);

    const updated = await campaigns.update(hotel.id, created.id, {
      productRetailerIds: ['retailer-a', 'retailer-c'],
    });

    expect(updated?.productRetailerIds).toEqual(['retailer-a', 'retailer-c']);
    expect(
      await prisma.broadcastCampaign.findUniqueOrThrow({
        where: { id: created.id },
        select: { productRetailerIds: true },
      }),
    ).toEqual({ productRetailerIds: ['retailer-a', 'retailer-c'] });
  });
});
