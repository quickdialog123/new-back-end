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
}
