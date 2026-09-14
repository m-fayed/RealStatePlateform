-- Boost / Featured Listings: additive columns on the Listing table.
ALTER TABLE "Listing" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN "featureType" TEXT;
ALTER TABLE "Listing" ADD COLUMN "featuredUntil" DATETIME;
