-- Chat tables. Pure additive — no existing tables touched.

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_buyerId_fkey"   FOREIGN KEY ("buyerId")   REFERENCES "User"    ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_brokerId_fkey"  FOREIGN KEY ("brokerId")  REFERENCES "User"    ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Conversation_listingId_buyerId_key"     ON "Conversation"("listingId", "buyerId");
CREATE        INDEX "Conversation_buyerId_updatedAt_idx"     ON "Conversation"("buyerId", "updatedAt");
CREATE        INDEX "Conversation_brokerId_updatedAt_idx"    ON "Conversation"("brokerId", "updatedAt");

CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey"       FOREIGN KEY ("senderId")       REFERENCES "User"         ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
