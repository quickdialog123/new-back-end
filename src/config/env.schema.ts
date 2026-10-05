import { z } from 'zod';

/**
 * every var need to check and validate to accept only the correct data and kept standardized
 */

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  API_PREFIX: z.string().min(1).default('api'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  REFRESH_TOKEN_TTL: z
    .string()
    .regex(
      /^\d+(s|m|h|d)$/,
      'REFRESH_TOKEN_TTL must be like 30s, 15m, 2h, or 7d',
    )
    .default('7d'),
  AUTH_SESSION_MAX_TTL: z
    .string()
    .regex(
      /^\d+(s|m|h|d)$/,
      'AUTH_SESSION_MAX_TTL must be like 30s, 15m, 2h, or 7d',
    )
    .default('30d'),
  SWAGGER_ENABLED: z.stringbool().default(false),
  SWAGGER_PATH: z.string().default('docs'),
  SWAGGER_TITLE: z.string().default('QuickDialog API'),
  SWAGGER_DESCRIPTION: z
    .string()
    .default('REST API for the QuickDialog hotel messaging platform.'),
  SWAGGER_VERSION: z.string().default('1.0'),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  return envSchema.parse(config);
}
