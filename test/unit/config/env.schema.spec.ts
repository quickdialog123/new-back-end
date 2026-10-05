import { describe, expect, it } from 'vitest';

import { envSchema } from '@quickdialog/config/env.schema.js';

const validEnv = {
  NODE_ENV: 'test',

  LOG_LEVEL: 'info',

  HOST: '0.0.0.0',

  PORT: '4099',

  CORS_ORIGIN: 'http://localhost:3000',

  API_PREFIX: 'api',

  DATABASE_URL:
    'postgresql://quickdialog:quickdialog@localhost:5432/quickdialog',

  JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long',

  JWT_ACCESS_TTL: '15m',

  JWT_ISSUER: 'quickdialog-api',

  JWT_AUDIENCE: 'quickdialog-web',

  REFRESH_TOKEN_TTL: '7d',

  AUTH_SESSION_MAX_TTL: '30d',

  SWAGGER_ENABLED: 'false',
};

describe('envSchema', () => {
  it('accepts valid environment values', () => {
    const result = envSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
  });

  it('coerces PORT to a number', () => {
    const result = envSchema.parse(validEnv);

    expect(result.PORT).toBe(4099);
  });

  it('rejects a short JWT secret', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      JWT_ACCESS_SECRET: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid access port', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      PORT: '70000',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid refresh token TTL', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      REFRESH_TOKEN_TTL: '7days',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid absolute session TTL', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      AUTH_SESSION_MAX_TTL: 'one-month',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid NODE_ENV', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('applies defaults for optional environment values', () => {
    const result = envSchema.parse({
      DATABASE_URL:
        'postgresql://quickdialog:quickdialog@localhost:5432/quickdialog',

      JWT_ACCESS_SECRET: 'test-secret-at-least-32-characters-long',

      JWT_ISSUER: 'quickdialog-api',

      JWT_AUDIENCE: 'quickdialog-web',
    });

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.JWT_ACCESS_TTL).toBe('15m');
    expect(result.REFRESH_TOKEN_TTL).toBe('7d');
    expect(result.AUTH_SESSION_MAX_TTL).toBe('30d');
  });
});
