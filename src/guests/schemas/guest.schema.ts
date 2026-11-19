import { z } from 'zod';

const guestFields = {
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100),
  email: z.string().trim().email().optional(),
  phoneNumber: z.string().trim().min(1).max(32),
  address: z.string().trim().optional(),
  checkInDate: z.iso.date(),
  checkOutDate: z.iso.date(),
  roomNumber: z.int(),
  floorNumber: z.int(),
};

export const createGuestSchema = z
  .object(guestFields)
  .refine((guest) => guest.checkOutDate > guest.checkInDate, {
    message: 'Check-out date must be after check-in date',
    path: ['checkOutDate'],
  });
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
    firstName: guestFields.firstName.optional(),
    lastName: guestFields.lastName.optional(),
    email: guestFields.email,
    phoneNumber: guestFields.phoneNumber.optional(),
    address: guestFields.address,
    checkInDate: guestFields.checkInDate.optional(),
    checkOutDate: guestFields.checkOutDate.optional(),
    roomNumber: guestFields.roomNumber.optional(),
    floorNumber: guestFields.floorNumber.optional(),
  })
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    {
      message: 'At least one guest field must be provided',
    },
  )
  .refine(
    (input) =>
      input.checkInDate === undefined ||
      input.checkOutDate === undefined ||
      input.checkOutDate > input.checkInDate,
    {
      message: 'Check-out date must be after check-in date',
      path: ['checkOutDate'],
    },
  );
export type UpdateGuestDTO = z.infer<typeof updateGuestSchema>;

export const guestIdParamSchema = z.object({ id: z.uuid() });
