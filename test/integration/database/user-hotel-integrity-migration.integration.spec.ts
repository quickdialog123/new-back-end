import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const schemaName = 'user_hotel_integrity_migration_test';
const renameMigrationPath = resolve(
  process.cwd(),
  'prisma/migrations/20261014212906_rename_hostel_to_hotel/migration.sql',
);

describe('User hotel integrity migration', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  beforeAll(async () => {
    await client.connect();
    await client.query(`CREATE SCHEMA ${schemaName}`);
    await client.query(`SET search_path TO ${schemaName}`);
    await client.query(`
      CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF', 'SUPER_ADMIN', 'CLIENT', 'AUTHORITY');

      CREATE TABLE "Hostel" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "phoneNumber" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );

      CREATE TABLE "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "role" "UserRole" NOT NULL,
        "hotelId" TEXT,
        CONSTRAINT "User_hotelId_fkey"
          FOREIGN KEY ("hotelId") REFERENCES "Hostel"("id") ON DELETE SET NULL
      );

      INSERT INTO "Hostel" ("id", "name", "phoneNumber", "token", "updatedAt")
      VALUES ('hotel-1', 'Existing Hotel', '+1 555 123 4567', 'hotel-token', CURRENT_TIMESTAMP);

      INSERT INTO "User" ("id", "email", "role", "hotelId")
      VALUES ('legacy-owner-1', 'legacy-owner@example.com', 'OWNER', NULL);
    `);

    const renameMigration = await readFile(renameMigrationPath, 'utf8');

    await expect(client.query(renameMigration)).rejects.toMatchObject({
      message: expect.stringContaining('assign a hotel'),
    });

    await client.query('ROLLBACK');
    await expect(
      client.query('SELECT "id" FROM "Hostel" WHERE "id" = \'hotel-1\''),
    ).resolves.toMatchObject({ rowCount: 1 });
    await client.query('DELETE FROM "User" WHERE "id" = \'legacy-owner-1\'');
    await client.query(renameMigration);
  });

  beforeEach(async () => {
    await client.query('DELETE FROM "User"');
  });

  afterAll(async () => {
    await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await client.end();
  });

  it('allows a super admin without a hotel', async () => {
    await expect(
      client.query(`
        INSERT INTO "User" ("id", "email", "role", "hotelId")
        VALUES ('super-admin-1', 'super-admin@example.com', 'SUPER_ADMIN', NULL)
      `),
    ).resolves.toBeDefined();
  });

  it.each(['OWNER', 'STAFF', 'CLIENT', 'AUTHORITY'] as const)(
    'rejects a %s without a hotel',
    async (role) => {
      await expect(
        client.query(`
          INSERT INTO "User" ("id", "email", "role", "hotelId")
          VALUES ('${role.toLowerCase()}-1', '${role.toLowerCase()}@example.com', '${role}', NULL)
        `),
      ).rejects.toMatchObject({ code: '23514' });
    },
  );

  it('allows a non-super-admin user with a hotel and prevents deleting that hotel', async () => {
    await client.query(`
      INSERT INTO "User" ("id", "email", "role", "hotelId")
      VALUES ('owner-1', 'owner@example.com', 'OWNER', 'hotel-1')
    `);

    await expect(
      client.query('DELETE FROM "Hotel" WHERE "id" = \'hotel-1\''),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
