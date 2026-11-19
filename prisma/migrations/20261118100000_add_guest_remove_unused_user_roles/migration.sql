DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User"
    WHERE "role"::text IN ('CLIENT', 'AUTHORITY')
  ) THEN
    RAISE EXCEPTION 'Cannot remove CLIENT/AUTHORITY roles while users with those roles exist. Migrate or remove those users first.';
  END IF;
END $$;

ALTER TABLE "User"
DROP CONSTRAINT "User_non_super_admin_requires_hotel";

ALTER TABLE "User"
ALTER COLUMN "role" TYPE TEXT
USING ("role"::text);

DROP TYPE "UserRole";
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF', 'SUPER_ADMIN');

ALTER TABLE "User"
ALTER COLUMN "role" TYPE "UserRole"
USING ("role"::"UserRole");

ALTER TABLE "User"
ADD CONSTRAINT "User_non_super_admin_requires_hotel"
CHECK ("role" = 'SUPER_ADMIN' OR "hotelId" IS NOT NULL);

CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "roomNumber" INTEGER NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Guest_hotelId_idx" ON "Guest"("hotelId");

ALTER TABLE "Guest"
ADD CONSTRAINT "Guest_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
