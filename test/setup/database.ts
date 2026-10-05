import { execSync } from 'node:child_process';

export function migrateTestDatabase(databaseUrl: string): void {
  execSync('pnpm prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },

    stdio: 'inherit',
  });
}
