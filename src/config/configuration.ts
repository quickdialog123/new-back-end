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

  meta: {
    graphVersion: process.env.META_GRAPH_VERSION,
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,

    test: {
      accessToken: process.env.META_TEST_ACCESS_TOKEN,
      phoneNumberId: process.env.META_TEST_PHONE_NUMBER_ID,
      wabaId: process.env.META_TEST_WABA_ID,
    },

    webhook: {
      verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN,
    },

    embeddedSignup: {
      configId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID,
    },
  },
});
