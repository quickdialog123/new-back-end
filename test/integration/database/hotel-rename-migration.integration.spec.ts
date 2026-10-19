import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const schemaName = 'hotel_rename_migration_test';
const migrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20261014212906_rename_hostel_to_hotel/migration.sql',
);

describe('Hotel rename migration', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  beforeAll(async () => {
    await client.connect();
    await client.query(`CREATE SCHEMA ${schemaName}`);
    await client.query(`SET search_path TO ${schemaName}`);
    await client.query(`
      CREATE TABLE "Hostel" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phoneNumber" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );

      CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF', 'SUPER_ADMIN', 'CLIENT', 'AUTHORITY');

      CREATE TABLE "User" (
        "id" TEXT PRIMARY KEY,
        "role" "UserRole" NOT NULL,
        "hotelId" TEXT,
        CONSTRAINT "User_hotelId_fkey"
          FOREIGN KEY ("hotelId") REFERENCES "Hostel"("id") ON DELETE SET NULL
      );

      INSERT INTO "Hostel" ("id", "name", "phoneNumber", "token", "updatedAt")
      VALUES ('hotel-1', 'Existing Hotel', '+1 555 123 4567', 'hotel-token', CURRENT_TIMESTAMP);

      INSERT INTO "User" ("id", "role", "hotelId") VALUES ('user-1', 'OWNER', 'hotel-1');
    `);
  });

  afterAll(async () => {
    await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await client.end();
  });

  it('preserves existing hotel records and user references', async () => {
    const migration = await readFile(migrationPath, 'utf8');

    await client.query(migration);

    const result = await client.query<{ hotelName: string; hotelId: string }>(`
      SELECT hotel."name" AS "hotelName", user_record."hotelId" AS "hotelId"
      FROM "User" AS user_record
      JOIN "Hotel" AS hotel ON hotel."id" = user_record."hotelId"
      WHERE user_record."id" = 'user-1'
    `);

    expect(result.rows).toEqual([
      {
        hotelName: 'Existing Hotel',
        hotelId: 'hotel-1',
      },
    ]);

    await expect(
      client.query(`
        INSERT INTO "Hotel" ("id", "name", "phoneNumber", "token", "updatedAt")
        VALUES ('hotel-2', 'Duplicate Token Hotel', '+1 555 987 6543', 'hotel-token', CURRENT_TIMESTAMP)
      `),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
