import { describe, expect, it } from 'vitest';
import {
  requestPhoneVerificationCodeSchema,
  verifyPhoneNumberCodeSchema,
  registerPhoneNumberSchema,
} from '@quickdialog/whatsapp/schemas/whatsapp-verification.schema.js';

describe('WhatsApp verification schemas', () => {
  it('accepts SMS or voice as the code delivery method', () => {
    expect(
      requestPhoneVerificationCodeSchema.safeParse({ method: 'SMS' }).success,
    ).toBe(true);
    expect(
      requestPhoneVerificationCodeSchema.safeParse({ method: 'VOICE' }).success,
    ).toBe(true);
    expect(
      requestPhoneVerificationCodeSchema.safeParse({ method: 'EMAIL' }).success,
    ).toBe(false);
  });

  it('requires a six-digit phone ownership verification code', () => {
    expect(
      verifyPhoneNumberCodeSchema.safeParse({ code: '012345' }).success,
    ).toBe(true);
    expect(
      verifyPhoneNumberCodeSchema.safeParse({ code: '12345' }).success,
    ).toBe(false);
    expect(
      verifyPhoneNumberCodeSchema.safeParse({ code: '12A456' }).success,
    ).toBe(false);
  });

  it('requires a six-digit WhatsApp registration PIN', () => {
    expect(registerPhoneNumberSchema.safeParse({ pin: '012345' }).success).toBe(
      true,
    );
    expect(registerPhoneNumberSchema.safeParse({ pin: '12345' }).success).toBe(
      false,
    );
    expect(registerPhoneNumberSchema.safeParse({ pin: '12A456' }).success).toBe(
      false,
    );
  });
});
