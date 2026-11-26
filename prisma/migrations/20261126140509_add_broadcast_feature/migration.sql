-- CreateEnum
CREATE TYPE "BroadcastGuestStatus" AS ENUM ('PENDING', 'RECEIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "BroadcastCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BroadcastCampaign" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateLanguage" TEXT NOT NULL,
    "status" "BroadcastCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "productRetailerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadcastCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastCampaignGuest" (
    "campaignId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "messageId" TEXT,
    "status" "BroadcastGuestStatus",

    CONSTRAINT "BroadcastCampaignGuest_pkey" PRIMARY KEY ("campaignId","guestId")
);

-- CreateIndex
CREATE INDEX "BroadcastCampaign_hotelId_idx" ON "BroadcastCampaign"("hotelId");

-- AddForeignKey
ALTER TABLE "BroadcastCampaign" ADD CONSTRAINT "BroadcastCampaign_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastCampaignGuest" ADD CONSTRAINT "BroadcastCampaignGuest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "BroadcastCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastCampaignGuest" ADD CONSTRAINT "BroadcastCampaignGuest_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
