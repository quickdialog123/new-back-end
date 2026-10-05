import { describe, expect, it } from 'vitest';

import { loginRequestSchema } from '@quickdialog/auth/schemas/login.schema.js';

describe('loginRequestSchema', () => {
  it('accepts a valid login request', () => {
    const result = loginRequestSchema.safeParse({
      email: 'owner@example.com',
      password: 'Password123!',
    });

    expect(result.success).toBe(true);
  });

  it('normalizes email if schema transforms it', () => {
    const result = loginRequestSchema.safeParse({
      email: 'OWNER@EXAMPLE.COM',
      password: 'Password123!',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginRequestSchema.safeParse({
      email: 'invalid-email',
      password: 'Password123!',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginRequestSchema.safeParse({
      email: 'owner@example.com',
      password: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const result = loginRequestSchema.safeParse({
      password: 'Password123!',
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const result = loginRequestSchema.safeParse({
      email: 'owner@example.com',
    });

    expect(result.success).toBe(false);
  });
});
