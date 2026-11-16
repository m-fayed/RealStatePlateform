# Current validation guide

Use Node 22.14 or newer. From `my-marketplace/`, install with `npm ci` and `npm ci --prefix server`. Generate Prisma using `npx prisma generate` from `server/` with DATABASE_URL configured (see its `.env.example`).

Run:

```sh
npm run lint
npm test
npm run lint --prefix server
npm test --prefix server
```

Frontend tests render real React components (auth, listing edit, role guard) and build production assets into a disposable directory. Server tests cover HTTP authentication/JWT/role checks, payment approval/rejection and mock gating, chat participant authorization/read pagination, upload/security validation, listing moderation, and concurrent credit spending. Tests use temporary SQLite databases and do not seed the development database. Consult test source for exact assertions; this is not exhaustive end-to-end coverage.

CI at `.github/workflows/ci.yml` installs both packages, generates Prisma and runs both lint/test suites. Node SQLite experimental and Vite bundle-size warnings may appear without test failures. Hosted CI results must be checked on GitHub after a push; local success does not establish a hosted run.

Manual checks: register a seeker; submit a broker license and approve as admin; request Vodafone Cash credits (balance unchanged until approval); create/edit/moderate a listing; verify sold/rented transitions; send/read chat from two participants and confirm a third account is denied; verify private documents cannot be fetched anonymously. Outside explicit development mock mode, card/Fawry must return 403 and leave balance/history unchanged.

Real payment settlement, full browser journeys, accessibility, load, backup recovery and multi-instance deployment remain separate validation work. See [security](my-marketplace/server/SECURITY.md) and [README](my-marketplace/README.md).
