CREATE TYPE "BroadcastGuestStatus" AS ENUM ('PENDING', 'RECEIVED', 'FAILED');
CREATE TYPE "BroadcastCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "BroadcastCampaign" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateLanguage" TEXT NOT NULL,
    "status" "BroadcastCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadcastCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BroadcastCampaignGuest" (
    "campaignId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "messageId" TEXT DEFAULT NULL,
    "status" "BroadcastGuestStatus" DEFAULT NULL,

    CONSTRAINT "BroadcastCampaignGuest_pkey" PRIMARY KEY ("campaignId", "guestId")
);

ALTER TABLE "BroadcastCampaignGuest"
ADD CONSTRAINT "BroadcastCampaignGuest_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "BroadcastCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BroadcastCampaignGuest"
ADD CONSTRAINT "BroadcastCampaignGuest_guestId_fkey"
FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
