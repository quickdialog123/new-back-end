export function setTestEnv(databaseUrl?: string): void {
  process.env.NODE_ENV = 'test';

  process.env.LOG_LEVEL = 'silent';

  process.env.HOST = '127.0.0.1';

  process.env.PORT = '4099';

  process.env.CORS_ORIGIN = 'http://localhost:3000';

  process.env.API_PREFIX = 'api';

  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
  }

  process.env.JWT_ACCESS_SECRET =
    'integration-test-secret-at-least-32-characters-long';

  process.env.JWT_ACCESS_TTL = '15m';

  process.env.JWT_ISSUER = 'quickdialog-api';

  process.env.JWT_AUDIENCE = 'quickdialog-web';

  process.env.REFRESH_TOKEN_TTL = '7d';

  process.env.AUTH_SESSION_MAX_TTL = '30d';

  process.env.SWAGGER_ENABLED = 'false';

  process.env.SWAGGER_PATH = 'docs';

  process.env.SWAGGER_TITLE = 'QuickDialog API';

  process.env.SWAGGER_DESCRIPTION = 'QuickDialog test API';

  process.env.SWAGGER_VERSION = '1.0';

  process.env.META_TOKEN_ENCRYPTION_KEY = 'xyz';

  process.env.META_GRAPH_VERSION = 'v26.0';

  process.env.META_APP_ID = '1234';

  process.env.META_APP_SECRET = 'secret_fb';

  process.env.META_WEBHOOK_VERIFY_TOKEN = 'webhook_fb_token';

  process.env.META_EMBEDDED_SIGNUP_CONFIG_ID = '99182';
}
