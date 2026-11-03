import { z } from 'zod';

const sixDigitCode = z.string().regex(/^\d{6}$/, 'Must be exactly 6 digits');

export const requestPhoneVerificationCodeSchema = z.object({
  method: z.enum(['SMS', 'VOICE']),
});

export const verifyPhoneNumberCodeSchema = z.object({
  code: sixDigitCode,
});

export const registerPhoneNumberSchema = z.object({
  pin: sixDigitCode,
});

export type RequestPhoneVerificationCodeDTO = z.infer<
  typeof requestPhoneVerificationCodeSchema
>;
export type VerifyPhoneNumberCodeDTO = z.infer<
  typeof verifyPhoneNumberCodeSchema
>;
export type RegisterPhoneNumberDTO = z.infer<typeof registerPhoneNumberSchema>;
