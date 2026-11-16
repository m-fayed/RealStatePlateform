# Current database schema

Authoritative source: `my-marketplace/server/prisma/schema.prisma` and `prisma/migrations/`. Provider: **SQLite**, accessed through Prisma 6; connection is `DATABASE_URL` (example `file:./dev.db`, relative to the Prisma schema directory). Apply migrations with `npx prisma migrate deploy` from `my-marketplace/server`, then generate the client with `npx prisma generate`.

There are five models. IDs are UUID strings. Roles, statuses, and methods are application-validated strings, not database enums. Timestamps use Prisma DateTime; all models have createdAt/updatedAt except Message, which has createdAt only.

| Model | Stored fields and constraints |
| --- | --- |
| User | id; name; unique phone; optional nonunique email; bcrypt password hash; role; status (default active); listingCredits integer default 0; optional licenseImageUrl, adLicense, rejectionReason; timestamps. Index: role/status. |
| Listing | id; brokerId FK; title; propertyType; offerType; price Float; city; optional area, sizeSqm Float, rooms Int, floor Int, description; images as JSON-encoded String default `[]`; adLicenseNo; status default active; moderationStatus default pending; optional moderationReason; viewsCount default 0; isFeatured default false; optional featureType/featuredUntil; timestamps. Indexes: status/createdAt, city, propertyType, offerType. |
| Conversation | id; listingId, buyerId, brokerId FKs; timestamps. Unique listingId/buyerId; indexes buyerId/updatedAt and brokerId/updatedAt. Broker is copied from listing at creation. |
| Message | id; conversationId and senderId FKs; body; nullable readAt; createdAt. Index conversationId/createdAt. |
| Transaction | id; brokerId FK; packageId, amount Float (EGP), credits Int snapshot; method; status default pending; optional senderNumber, receiptUrl, rejectionReason, reviewedById, reviewedAt; timestamps. Indexes status/createdAt and brokerId/createdAt. reviewedById is a string, not a foreign key. |

All declared relations cascade on deletion. User owns listings and transactions, participates in conversations as buyer/broker, and sends messages. Listing has conversations; Conversation has messages. There are no separate ListingImages or Notifications tables.

## State and transaction rules

- User roles: seeker, broker, admin; account statuses: pending, active, rejected, suspended. Brokers require review; suspended accounts cannot use protected APIs.
- Listing lifecycle status: active, sold, rented, deleted. Moderation is separate: pending, approved, rejected, hidden. Public collection requires active status, approved moderation, and active broker. Detail can display sold/rented listings. Deletion via API is soft deletion.
- Credit purchases use pending/completed/rejected transactions. Vodafone Cash approval conditionally changes pending to completed and increments credits in the same transaction. Repeated approval cannot grant again. Card/Fawry mocks require explicit development flags; there is no real gateway.
- Listing creation and boosting conditionally decrement credits only when balance covers cost, within the same transaction as the listing mutation. Failed debit rolls back everything. Transaction rows represent purchases, not a complete spending ledger.
- readAt records receipt of incoming messages returned by the message API. Cursor pagination sorts createdAt/id descending; one conversation exists per listing/buyer.

## Files, migrations, and limitations

Photos reside under `server/uploads/public`; licenses/receipts and ownership metadata under `server/uploads/private`. Database fields store URLs, not binary content. Backups must include both the SQLite database and uploads. Do not commit runtime databases or private documents.

Use checked-in migrations for existing databases; do not replace them with schema push in release automation. Tests migrate disposable SQLite databases rather than modifying the developer database. Seed requires explicit ADMIN_EMAIL and a strong ADMIN_PASSWORD; no predictable password is supplied or printed.

Money currently uses Float, not fixed decimal/minor-unit integers. Strings rely on Zod/controller validation rather than database enum/check constraints. Rate limiting is process-local, and file/database operations are not one atomic storage transaction. These are deployment considerations, not production-readiness guarantees. See [API](API_DOCUMENTATION.md) and [application README](my-marketplace/README.md).
