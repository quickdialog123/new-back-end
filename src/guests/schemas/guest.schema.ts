import { z } from 'zod';

const guestFields = {
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  phoneNumber: z.string().trim().min(1).max(32),
};

export const createGuestSchema = z.object(guestFields);
export type CreateGuestDTO = z.infer<typeof createGuestSchema>;

export const bulkCreateGuestsSchema = z.object({
  guests: z.array(createGuestSchema).min(1).max(500),
});
export type BulkCreateGuestsDTO = z.infer<typeof bulkCreateGuestsSchema>;

export const bulkDeleteGuestsSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(500),
});
export type BulkDeleteGuestsDTO = z.infer<typeof bulkDeleteGuestsSchema>;

export const updateGuestSchema = z
  .object({
    fullName: guestFields.fullName.optional(),
    email: guestFields.email.optional(),
    phoneNumber: guestFields.phoneNumber.optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'At least one guest field must be provided',
  });
export type UpdateGuestDTO = z.infer<typeof updateGuestSchema>;

export const guestIdParamSchema = z.object({ id: z.uuid() });
