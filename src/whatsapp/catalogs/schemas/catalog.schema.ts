import { z } from 'zod';

export const createCatalogSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const connectCatalogSchema = z.object({
  catalogId: z.string().min(1),
});

export const updateCatalogSettingsSchema = z
  .object({
    catalogVisible: z.boolean().optional(),
    cartEnabled: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.catalogVisible !== undefined || value.cartEnabled !== undefined,
    {
      message: 'At least one catalog setting is required',
    },
  );

export type CreateCatalogDto = z.infer<typeof createCatalogSchema>;
export type ConnectCatalogDto = z.infer<typeof connectCatalogSchema>;
export type UpdateCatalogSettingsDto = z.infer<
  typeof updateCatalogSettingsSchema
>;
