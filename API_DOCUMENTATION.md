# Current HTTP API

Source: `my-marketplace/server/src/routes/` and controllers. Base URL: `http://localhost:5002/api`. JSON requests use `Content-Type: application/json`; uploads use multipart form data. Authentication uses `Authorization: Bearer <token>`. Protected routes require an active account. JWTs expire after seven days.

## Authentication

| Method/path | Request / behavior |
| --- | --- |
| POST `/auth/register/seeker` | `name, phone, password, email?`; creates active seeker and returns token |
| POST `/auth/register/broker` | `name, phone, email, password, license_image_url, license_upload_token, ad_license_no`; creates pending broker, no token |
| POST `/auth/login` | `phone, password`; active accounts only |
| GET `/auth/me` | Current safe user profile, including credit balance |

Registration passwords are 8–72 characters. Login allows at most five failed attempts per IP in 15 minutes, then returns 429 with Retry-After. This limiter is process-local. There is no OTP, password recovery, or refresh-token API.

## Listings and brokers

| Method/path | Access / behavior |
| --- | --- |
| GET `/listings` | Public approved active listings from active brokers; maximum 100 |
| GET `/listings/mine` | Broker's nondeleted listings |
| GET `/listings/:id` | Public approved, nondeleted listing from active broker; increments views |
| POST `/listings` | Broker; costs one credit; starts pending moderation |
| PUT `/listings/:id` | Owner broker; partial edit, no credit charge; returns to pending moderation unless hidden |
| PATCH `/listings/:id/status` | Owner; `{status:"active"|"sold"|"rented"}`; sold requires sale, rented requires rent |
| DELETE `/listings/:id` | Owner; soft deletion |
| POST `/listings/:id/boost` | Owner; `{type, duration_days?}` |
| GET `/brokers/:id` | Public active broker profile and approved active listings |

Listing fields: `title, property_type, offer_type, price, city`, optional `area, size_sqm, rooms, floor, description, images, ad_license_no`. Types: apartment, villa, duplex, penthouse, studio, shop, office, clinic, warehouse, land. Offers: sale/rent. Images are URL arrays (maximum ten); description maximum 5,000 characters. See controller Zod schemas for exact limits.

List filters: `city, property_type, offer_type, min_price, max_price, q, broker_id`; sort: newest, oldest, price_asc, price_desc. There is no listing pagination; boost ranking runs after the 100-row cap. Top boost costs 30 credits/3 days or 60/7 days; badge costs 20/7 days; premium costs 80/7 days. Credit debit and paid mutation share one conditional Prisma transaction. Insufficient balance returns 402 with `code: "INSUFFICIENT_CREDITS"`; success includes actual `credits_remaining`.

## Credits and payments (broker only)

- GET `/credits/packages`: packages, methods, `mock_payments_enabled`, and Vodafone Cash wallet.
- POST `/credits/purchase`: `{package:"small"|"medium"|"large", method:"vodafone_cash"|"card"|"fawry", sender_number?, receipt_url?}`.
- GET `/credits/transactions`: current broker's history.

Packages are 5 credits/50 EGP, 10/90 EGP, and 20/150 EGP. Server values override client-supplied pricing. Vodafone Cash requires sender number and creates a pending request; receipt is optional and must be owned. Only admin approval grants credits, once. Card/Fawry have no gateway integration: mock completion is enabled only with BOTH `NODE_ENV=development` and `ENABLE_MOCK_PAYMENTS=true`. Otherwise purchase returns 403, `MOCK_PAYMENTS_DISABLED`, zero credits, and logs the attempt.

## Admin (admin role required)

- GET `/admin/registrations`; POST `/admin/registrations/:id/approve`; POST `/admin/registrations/:id/reject` with optional `reason`.
- GET `/admin/statistics`: flat counters including active_brokers, seekers, total_listings, pending_registrations, pending_transactions.
- GET `/admin/brokers`; PATCH `/admin/brokers/:id/suspension` with `{suspended:boolean}` (active/suspended transitions only).
- GET `/admin/listings`; PATCH `/admin/listings/:id/moderation` with `{action:"approve"|"reject"|"hide", reason?}`.
- GET `/admin/transactions?status=pending|completed|rejected`; PATCH `/admin/transactions/:id/approve`; PATCH `/admin/transactions/:id/reject` with optional `reason`.

## Chat (authenticated participants only)

- GET `/conversations`: own inbox, newest activity first, maximum 100, including `last_message` and `unread_count`.
- POST `/conversations` with `{listing_id}`: idempotent per listing/buyer; new conversation requires a visible active listing and a caller other than its owner.
- GET `/conversations/:id`: participant-only metadata.
- GET `/conversations/:id/messages?limit=50&cursor=<message-id>`: limit 1–50, default 50, newest first by createdAt/id. Response includes `messages, next_cursor, has_more`. Cursor must belong to the conversation. Returned incoming messages are marked read (`readAt`).
- POST `/conversations/:id/messages` with `{body}`: trimmed 1–4,000 characters.

Nonparticipants receive 403. Existing conversation history remains accessible after listing moderation. Chat uses HTTP polling, not WebSockets.

## Uploads

- POST `/uploads/images`: broker; multipart `images`, up to ten images, 5 MB each; returns `urls`.
- POST `/uploads/license`: anonymous preregistration; multipart `license`, single image/PDF; returns `url, upload_token`. Registration claims this private document once.
- POST `/uploads/receipt`: broker; multipart `receipt`, single image/PDF; returns `url`.
- GET `/uploads/documents/:filename`: owner/admin authenticated private download, no-store.

Uploads allow 20 requests/IP/15 minutes. Magic bytes determine JPEG/PNG/GIF/WebP/PDF type and must match extension; listing photos cannot be PDF. Public photos are served from `/uploads/:filename` outside `/api`; private documents reside separately, with protected legacy-document handling. Unreferenced files older than 24 hours are cleaned at startup/hourly; database query failure aborts cleanup.

## Responses and limits

Controllers generally return `{success, ...}` and failures `{success:false,message,code?}`. Global errors and 404s currently use `{error,...}`; consumers must not assume one normalized error envelope. Statuses include 200/201, 400, 401, 402, 403, 404, 409, 429, 500. GET `/api/health` reports process health, not database readiness.

Validation uses Zod; persistence uses Prisma with SQLite. See [schema](DATABASE_SCHEMA.md), [setup](my-marketplace/README.md), and [security limitations](my-marketplace/server/SECURITY.md). Tests exercise important paths; they do not certify production readiness or real payment settlement.
