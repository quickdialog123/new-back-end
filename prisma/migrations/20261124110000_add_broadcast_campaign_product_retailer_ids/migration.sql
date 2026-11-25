ALTER TABLE "BroadcastCampaign"
ADD COLUMN "productRetailerIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
