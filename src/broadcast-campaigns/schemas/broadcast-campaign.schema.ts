import { z } from 'zod';

const guestIdsSchema = z
  .array(z.uuid())
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Guest IDs must be unique',
  });

const campaignFields = {
  name: z.string().trim().min(1).max(120),
  templateName: z.string().regex(/^[a-z0-9_]+$/),
  templateLanguage: z.string().regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/),
  guestIds: guestIdsSchema.optional(),
};

export const createBroadcastCampaignSchema = z.object(campaignFields);
export type CreateBroadcastCampaignDTO = z.infer<
  typeof createBroadcastCampaignSchema
>;

export const updateBroadcastCampaignSchema = z
  .object({
    name: campaignFields.name.optional(),
    templateName: campaignFields.templateName.optional(),
    templateLanguage: campaignFields.templateLanguage.optional(),
    guestIds: campaignFields.guestIds.optional(),
  })
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    {
      message: 'At least one campaign field must be provided',
    },
  );
export type UpdateBroadcastCampaignDTO = z.infer<
  typeof updateBroadcastCampaignSchema
>;

export const broadcastCampaignIdSchema = z.object({ id: z.uuid() });
export type BroadcastCampaignIdDTO = z.infer<typeof broadcastCampaignIdSchema>;
