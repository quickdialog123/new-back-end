import { describe, expect, it } from 'vitest';
import { registerPhoneNumberSchema } from '@quickdialog/whatsapp/schemas/whatsapp-verification.schema.js';

describe('WhatsApp registration schema', () => {
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
