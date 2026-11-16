# عقاري — Egyptian real estate marketplace

Arabic RTL marketplace for seekers and manually reviewed brokers. The current
implementation uses React 19, Vite 8, Tailwind CSS 4 and Axios; an Express REST
API with Zod validation, bcrypt/JWT authentication; and **SQLite through Prisma 6**.

This is a tested development baseline, not a production-readiness certification.
Card/Fawry have no real payment gateway. OTP, password recovery, notifications,
government license verification, reviews and favorites are not implemented.

## Requirements and setup

Use Node.js **22.14+** (Node 22 is used in CI) and npm. Tests use Node's built-in
SQLite API. Install both applications; the server lint command shares ESLint
packages installed at the frontend root, with its own Node-only configuration.

From `my-marketplace/`:

```sh
npm ci
npm ci --prefix server
```

Copy `.env.example` to `.env` and `server/.env.example` to `server/.env`. Do not
overwrite an existing configuration. Set a long random `JWT_SECRET` on the server.

| Variable | Purpose/default |
| --- | --- |
| `VITE_API_URL` | Frontend API URL: `http://localhost:5002/api` |
| `PORT` | API listener: `5002` |
| `DATABASE_URL` | `file:./dev.db`, relative to the Prisma schema directory |
| `CORS_ORIGIN` | Allowed frontend origins, comma-separated; default `http://localhost:5173` |
| `JWT_SECRET` | Required JWT signing secret; never commit it |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Required by seed and production startup |
| `ADMIN_PHONE` | Seeded admin's phone login; default `+201000000000` |
| `ADMIN_NAME` | Optional admin display name |
| `NODE_ENV`, `ENABLE_MOCK_PAYMENTS` | Mock payments require exactly `development` and `true` together |
| `UPLOADS_DIR` | Optional absolute persistent upload directory; default `server/uploads` |

Admin passwords must have 12–72 characters, uppercase/lowercase, a digit and a
symbol; placeholder passwords are rejected. Account registration requires 8–72
characters. Login remains phone/password based; JWTs expire after seven days.

Initialize the database from `server/`:

```sh
npx prisma generate
npx prisma migrate deploy
# Configure ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_PHONE first:
npm run seed
```

Seed creates or updates the admin matching `ADMIN_PHONE`, including its password;
it is an explicit administrative action, not part of normal startup or CI.

Run in two terminals, both initially at `my-marketplace/`:

```sh
# Terminal 1: API at http://localhost:5002
npm run dev --prefix server

# Terminal 2: Vite frontend, normally http://localhost:5173
npm run dev
```

If Vite chooses a different port, update `CORS_ORIGIN` and restart the API.
`GET http://localhost:5002/api/health` checks the HTTP server, not database readiness.

## Implemented workflows

- Public search/filtering, property details, galleries and broker profiles.
- Seeker registration; broker license upload and admin registration review.
- Broker listing creation/editing/deletion, active/sold/rented status controls.
- Separate listing moderation: pending/approved/rejected/hidden. Edits require
  review again; hidden listings cannot be republished by changing their sale status.
- Admin broker suspension/restoration, listing review and credit-request review.
- Credits: creation costs one; boosts consume configured credits atomically with
  the listing write. Insufficient funds return HTTP 402 without overspending.
- Manual Vodafone Cash requests remain pending until admin approval. Card/Fawry
  are development mocks only; production rejects them with 403 and zero credits.
- Participant-only chat, newest-first cursor pages of up to 50, read receipts and
  unread counts. Delivery uses polling, not WebSockets.
- Public listing photos and private owner/admin-only licenses/receipts. Magic-byte
  and extension checks, upload limits and orphan cleanup are implemented.
- Auth state refresh on startup, credit mutations, focus and every 15 seconds.

## Architecture

`src/pages` → `src/services` (Axios/Bearer JWT) → `server/src/routes` → middleware
and controllers → Prisma → SQLite. Serializers translate database camelCase to
API snake_case. Files live on disk, while their URLs are stored in SQLite.

```text
realEstate/
  .github/workflows/ci.yml
  API_DOCUMENTATION.md
  DATABASE_SCHEMA.md
  my-marketplace/
    src/                    React pages, components, auth context, API services
    tests/                  React render and production-build smoke tests
    eslint.config.js        Browser/React source and Node tooling scopes
    server/
      src/                  Express routes, middleware, controllers and tests
      prisma/               SQLite schema, migrations and explicit admin seed
      uploads/public/       Public photos
      uploads/private/      Protected documents and ownership metadata
      eslint.config.js      Node-only rules
```

## Release checks

From `my-marketplace/`:

```sh
npm run lint
npm test
npm run lint --prefix server
npm test --prefix server
npm run build
```

Frontend tests render real React components for login, listing editing and role
guards, then build to a disposable temporary directory. They are smoke tests,
not full browser end-to-end tests. API tests use isolated temporary SQLite files,
apply every migration and send HTTP requests to ephemeral local ports. They do
not seed or modify the development database. Node may print its SQLite experimental
warning; Vite may report a non-fatal bundle-size warning.

GitHub Actions runs both lint commands and both test suites on pushes and pull
requests. Passing local tests does not mean the hosted workflow has already run.

## Deployment limits

Use persistent storage and back up SQLite and uploads together. Rate limits are
process-local (five failed logins and twenty uploads per IP per fifteen minutes);
multiple instances need a shared limiter. Configure trusted reverse proxies
deliberately. Files older than 24 hours are removed only when unreferenced.
Legacy uploads are classified before startup; ambiguous files become private.

Before a public deployment, review session storage (`localStorage`), token
revocation/recovery, central error sanitization, monitoring, backups, file scanning,
real payment integration, legal pages and browser/accessibility coverage.

See [API reference](../API_DOCUMENTATION.md), [database schema](../DATABASE_SCHEMA.md),
[security configuration](server/SECURITY.md) and [workflow behavior](server/WORKFLOWS.md).
