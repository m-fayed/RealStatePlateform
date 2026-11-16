# Core workflows

After updating, run from `server/`:

    npx prisma generate
    npx prisma migrate deploy

The additive moderation migration preserves approval for existing listings.
New listings await review. Edits return a listing to pending review, except
hidden listings remain hidden. Approval/rejection/hiding never changes its
sale/rental status. Only approved listings from active brokers appear publicly.
Restoring a broker does not restore rejected/hidden listings.

## Listing APIs (active broker, ownership required)

- `GET /api/listings/mine`: all owned non-deleted listings, including sold,
  rented, pending, rejected and hidden. Public listing filters cannot retrieve these.
- `PUT /api/listings/:id`: existing update endpoint, now connected to the edit
  form. Partial updates preserve omitted images. Editing consumes no credits.
- `PATCH /api/listings/:id/status` with `{ "status": "active|sold|rented" }`.
  Sold applies to sale offers; rented applies to rent offers. Reopening does
  not change moderation approval. Changing the offer type of a closed listing
  reopens it while sending the edit for review.

## Administration (active admin only)

- `GET /api/admin/brokers`: broker names, contact details and account statuses.
- `PATCH /api/admin/brokers/:id/suspension` with `{ "suspended": true|false }`:
  active → suspended or suspended → active only. Pending/rejected registrations
  must use registration review; unsuspension cannot bypass it.
- `GET /api/admin/listings`: all non-deleted listings and moderation metadata.
- `PATCH /api/admin/listings/:id/moderation` with
  `{ "action": "approve|reject|hide", "reason": "optional, max 500 characters" }`.

Responses expose `moderation_status` and `moderation_reason`. Suspended brokers
lose authenticated access immediately because middleware reloads account status
on every request. Their profile and listings disappear from public endpoints.

## Messaging (conversation participants only)

`GET /api/conversations/:id/messages?limit=50&cursor=<message-id>` returns:

    { "success": true, "messages": [], "has_more": false, "next_cursor": null }

Messages are newest first, with `createdAt DESC, id DESC` ordering so tied
timestamps and new inserts do not cause duplicate/omitted older pages. Limit
defaults to 50, accepts 1–50. Cursor must belong to this conversation. Use
`next_cursor` for older messages. Fetching a page marks only returned incoming
messages read; fetching the inbox does not mark anything read.

`GET /api/conversations` includes `unread_count` per conversation. The inbox
refreshes every five seconds/on focus. Chat displays messages chronologically,
loads older pages without discarding loaded history, and shows read receipts.
Polling catches up across multiple pages after inactivity and pauses in a
hidden tab. Existing conversations remain available for historical messaging;
new conversations require a visible active listing from an active broker.

## Authentication state

AuthContext validates cached login through `GET /api/auth/me` at startup.
Protected content waits for this check and offers retry on network failure.
Credit-consuming/purchasing responses trigger another refresh; focus and a
15-second periodic refresh pick up manual admin credit approvals and suspension.
Out-of-date responses cannot overwrite a newer session or revive logout.

Broker Dashboard uses the same form for creation/editing and always shows
status/moderation controls. AdminPanel adds broker suspension and listing review.

## Verification

    node --test src/workflows.test.js src/security.test.js src/controllers/*.test.js

From the frontend root:

    npm run lint
    npm run build
