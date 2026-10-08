ALTER TYPE "UserRole" ADD VALUE 'CLIENT';
ALTER TYPE "UserRole" ADD VALUE 'AUTHORITY';

CREATE TABLE "Hostel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hostel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Hostel_token_key" ON "Hostel"("token");

ALTER TABLE "User"
ADD CONSTRAINT "User_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hostel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
