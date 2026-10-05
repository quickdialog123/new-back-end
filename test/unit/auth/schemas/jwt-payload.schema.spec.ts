import { describe, expect, it } from 'vitest';

import { jwtPayloadSchema } from '@quickdialog/auth/schemas/jwt-payload.schema.js';

const validPayload = {
  sub: '4e3ee6a0-eec9-47c8-9fe3-e92afe8a2b1b',
  sid: '8d234fad-ceec-4f64-bb1b-1459c0b16cd7',
  hotelId: null,
  role: 'OWNER' as const,
};

describe('jwtPayloadSchema', () => {
  it('accepts a valid payload', () => {
    const result = jwtPayloadSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it('accepts a valid hotel id', () => {
    const result = jwtPayloadSchema.safeParse({
      ...validPayload,
      hotelId: 'c5497c67-4e65-4644-bbb9-e9fb40f76627',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty user id', () => {
    const result = jwtPayloadSchema.safeParse({
      ...validPayload,
      sub: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid session id', () => {
    const result = jwtPayloadSchema.safeParse({
      ...validPayload,
      sid: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid hotel id', () => {
    const result = jwtPayloadSchema.safeParse({
      ...validPayload,
      hotelId: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid role', () => {
    const result = jwtPayloadSchema.safeParse({
      ...validPayload,
      role: 'INVALID',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a missing sid', () => {
    const { sid: _, ...payload } = validPayload;

    const result = jwtPayloadSchema.safeParse(payload);

    expect(result.success).toBe(false);
  });
});
