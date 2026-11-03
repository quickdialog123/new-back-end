-- Existing hotels remain available after this additive migration.
ALTER TABLE "Hotel" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
