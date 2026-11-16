ALTER TABLE "Listing" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Listing" ADD COLUMN "moderationReason" TEXT;
-- Preserve visibility of listings published before moderation was introduced.
UPDATE "Listing" SET "moderationStatus" = 'approved';
