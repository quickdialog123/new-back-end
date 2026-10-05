-- Add a nullable tenant reference before hotel records are introduced.
ALTER TABLE "User" ADD COLUMN "hotelId" TEXT;

CREATE INDEX "User_hotelId_idx" ON "User"("hotelId");
