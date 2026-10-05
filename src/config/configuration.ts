/**
 * config file
 */
export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV,
    host: process.env.HOST,
    port: Number(process.env.PORT),
    corsOrigin: process.env.CORS_ORIGIN,
    prefix: process.env.API_PREFIX,
    logLevel: process.env.LOG_LEVEL,
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  auth: {
    accessToken: {
      secret: process.env.JWT_ACCESS_SECRET,
      ttl: process.env.JWT_ACCESS_TTL,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    },

    refreshToken: {
      ttl: process.env.REFRESH_TOKEN_TTL,
    },

    session: {
      maxTtl: process.env.AUTH_SESSION_MAX_TTL,
    },
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH ?? 'docs',
    title: process.env.SWAGGER_TITLE ?? 'QuickDialog API',
    description:
      process.env.SWAGGER_DESCRIPTION ??
      'REST API for the QuickDialog hotel messaging platform.',
    version: process.env.SWAGGER_VERSION ?? '1.0',
  },
});
