import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | undefined;

export async function startTestPostgres(): Promise<string> {
  container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('quickdialog_test')
    .withUsername('quickdialog')
    .withPassword('quickdialog')
    .start();

  return container.getConnectionUri();
}

export async function stopTestPostgres(): Promise<void> {
  await container?.stop();
  container = undefined;
}
