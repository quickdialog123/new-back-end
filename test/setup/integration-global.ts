import { execSync } from 'node:child_process';

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | undefined;

export async function setup() {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('quickdialog_test')
    .withUsername('quickdialog')
    .withPassword('quickdialog')
    .start();

  const databaseUrl = container.getConnectionUri();

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;

  process.env.JWT_ACCESS_SECRET =
    'integration-test-secret-at-least-32-characters-long';

  process.env.JWT_ACCESS_TTL = '15m';
  process.env.JWT_ISSUER = 'quickdialog-api';
  process.env.JWT_AUDIENCE = 'quickdialog-web';
  process.env.REFRESH_TOKEN_TTL = '7d';
  process.env.AUTH_SESSION_MAX_TTL = '30d';

  process.env.CORS_ORIGIN = 'http://localhost:3000';

  process.env.API_PREFIX = 'api';

  execSync('pnpm prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  });
}

export async function teardown() {
  await container?.stop();
}
