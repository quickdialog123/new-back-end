BEGIN;

-- Stop before changing the legacy schema when users still need a hotel assignment.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE "role" <> 'SUPER_ADMIN' AND "hotelId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot rename Hostel to Hotel: assign a hotel to every non-super-admin user before applying this migration.';
  END IF;
END $$;

-- Rename the existing tenant table so existing hotel records are preserved.
ALTER TABLE "Hostel" RENAME TO "Hotel";

ALTER TABLE "Hotel" RENAME CONSTRAINT "Hostel_pkey" TO "Hotel_pkey";

ALTER INDEX "Hostel_token_key" RENAME TO "Hotel_token_key";

ALTER TABLE "User" DROP CONSTRAINT "User_hotelId_fkey";

ALTER TABLE "User"
  ADD CONSTRAINT "User_hotelId_fkey"
  FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_non_super_admin_requires_hotel"
  CHECK ("role" = 'SUPER_ADMIN' OR "hotelId" IS NOT NULL);

COMMIT;
