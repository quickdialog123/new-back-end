import { z } from 'zod';

const sixDigitCode = z.string().regex(/^\d{6}$/, 'Must be exactly 6 digits');

export const registerPhoneNumberSchema = z.object({
  pin: sixDigitCode,
});

export type RegisterPhoneNumberDTO = z.infer<typeof registerPhoneNumberSchema>;
