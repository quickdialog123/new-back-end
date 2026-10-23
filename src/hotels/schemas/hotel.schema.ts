import { z } from 'zod';
import { Buffer } from 'node:buffer';

const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must be at most 72 bytes',
  });

export const createHotelSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phoneNumber: z.string().trim().min(1).max(32),
  token: z.string().trim().min(1).max(128),
  owner: z.object({
    email: z.string().trim().email(),
    fullName: z.string().trim().min(1).max(200),
    password: passwordSchema,
  }),
});

export type CreateHotelDTO = z.infer<typeof createHotelSchema>;

export const updateHotelSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    phoneNumber: z.string().trim().min(1).max(32).optional(),
    token: z.string().trim().min(1).max(128).optional(),
  })
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    {
      message: 'At least one hotel field must be provided',
    },
  );

export type UpdateHotelDTO = z.infer<typeof updateHotelSchema>;

export const hotelIdParamSchema = z.object({
  id: z.uuid(),
});
