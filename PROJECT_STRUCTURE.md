# Current project structure

The Git repository root contains documentation and `.github/workflows/ci.yml`. Application source lives under `my-marketplace/`.

```text
my-marketplace/
  src/
    components/       shared UI, listing form, upload and moderation controls
    context/          authentication state and startup refresh
    hooks/            React hooks
    pages/            browsing, dashboards, auth, credits, inbox and chat
    services/         Axios API clients and authenticated document retrieval
    constants/        API and display constants
  tests/              React render and production-build smoke tests
  server/
    prisma/           SQLite schema, migrations, explicit admin seed
    src/
      controllers/    auth, listings, brokers, credits, admin, chat, uploads
      routes/         Express endpoint wiring
      middleware/     authentication and role checks
      lib/            Prisma, security, uploads, credits, boost, serializers
      *.test.js       HTTP integration and security/workflow tests
    uploads/          runtime public photos and private documents (not source)
```

Frontend and server have separate package scripts and ESLint configurations. Install both packages. React calls `/api` over HTTP; Express validates with Zod and uses Prisma transactions against SQLite. Public photos are static files; private documents require authorization. See [setup](my-marketplace/README.md), [API](API_DOCUMENTATION.md), and [schema](DATABASE_SCHEMA.md).
