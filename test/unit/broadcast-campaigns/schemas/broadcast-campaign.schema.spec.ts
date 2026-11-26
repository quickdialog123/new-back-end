import { describe, expect, it } from 'vitest';
import {
  createBroadcastCampaignSchema,
  updateBroadcastCampaignSchema,
} from '@quickdialog/broadcast-campaigns/schemas/broadcast-campaign.schema.js';

describe('broadcast campaign schemas', () => {
  const validCampaign = {
    name: 'Summer offer',
    templateName: 'summer_offer',
    templateLanguage: 'en_US',
    guestIds: ['123e4567-e89b-12d3-a456-426614174000'],
  };

  it('accepts a campaign with selected guest IDs', () => {
    expect(createBroadcastCampaignSchema.safeParse(validCampaign).success).toBe(
      true,
    );
  });

  it('accepts unique ordered product retailer IDs on create and update', () => {
    const productRetailerIds = ['retailer-2', 'retailer-1'];

    expect(
      createBroadcastCampaignSchema.safeParse({
        ...validCampaign,
        productRetailerIds,
      }).success,
    ).toBe(true);
    expect(
      updateBroadcastCampaignSchema.safeParse({ productRetailerIds }).success,
    ).toBe(true);
  });

  it('rejects duplicate product retailer IDs', () => {
    expect(
      createBroadcastCampaignSchema.safeParse({
        ...validCampaign,
        productRetailerIds: ['same-product', 'same-product'],
      }).success,
    ).toBe(false);
  });

  it('accepts a draft campaign before guests are selected', () => {
    expect(
      createBroadcastCampaignSchema.safeParse({
        name: validCampaign.name,
        templateName: validCampaign.templateName,
        templateLanguage: validCampaign.templateLanguage,
      }).success,
    ).toBe(true);
  });

  it('rejects duplicate guest IDs in a campaign', () => {
    expect(
      createBroadcastCampaignSchema.safeParse({
        ...validCampaign,
        guestIds: [validCampaign.guestIds[0], validCampaign.guestIds[0]],
      }).success,
    ).toBe(false);
  });

  it('requires at least one field when updating a campaign', () => {
    expect(updateBroadcastCampaignSchema.safeParse({}).success).toBe(false);
    expect(
      updateBroadcastCampaignSchema.safeParse({ name: 'Updated offer' })
        .success,
    ).toBe(true);
  });
});
