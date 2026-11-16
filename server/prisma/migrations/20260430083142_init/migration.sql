-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "licenseImageUrl" TEXT,
    "adLicense" TEXT,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brokerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "offerType" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "sizeSqm" REAL,
    "rooms" INTEGER,
    "floor" INTEGER,
    "description" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "adLicenseNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_city_idx" ON "Listing"("city");

-- CreateIndex
CREATE INDEX "Listing_propertyType_idx" ON "Listing"("propertyType");

-- CreateIndex
CREATE INDEX "Listing_offerType_idx" ON "Listing"("offerType");
