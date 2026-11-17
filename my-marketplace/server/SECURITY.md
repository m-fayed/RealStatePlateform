# Authentication and upload configuration

Production startup also requires `JWT_SECRET` with at least 32 cryptographically
random characters. Generate it using
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
and store it in your deployment's secret manager or uncommitted server `.env`.
Startup rejects missing, short, whitespace-containing, known placeholder,
repeating-pattern and obviously low-complexity values without printing the secret.
Validation cannot prove randomness: always use a cryptographic generator rather
than inventing a password. Rotating this secret invalidates existing JWTs.

Production startup and `npm run seed` require `ADMIN_EMAIL` and
`ADMIN_PASSWORD`. Use a valid email and a non-placeholder password of 12–72
characters containing uppercase/lowercase letters, a digit and a symbol.
Seed never prints the password. `ADMIN_PHONE` still controls phone-based login;
`ADMIN_NAME` is optional. Production startup validates credentials but does not
run seed or change any database accounts. Rotate previously seeded credentials
by explicitly rerunning seed with the intended phone and new credentials.

Registration passwords require at least 8 characters. JWT expiration remains
7 days. Login permits at most five failed attempts per IP within 15 minutes;
successful logins do not consume an attempt. Uploads allow 20 requests per IP
per 15 minutes. Limits reserve in-flight attempts and return 429/Retry-After.
These counters are process-local and reset on restart. Multi-instance deployments
need a shared limiter store. Express does not trust forwarded IP headers; configure
a trusted proxy deliberately before deploying behind a reverse proxy.

Files are limited to 5 MB each, at most 10 listing photos per request. Magic
bytes identify JPEG, PNG, GIF, WebP or PDF; the original extension must match the
identified type (.jpeg is accepted for JPEG). Client MIME is not trusted. This is
signature checking, not antivirus scanning or a full file-format decoder.

Only `uploads/public` is exposed as static content. Licenses and receipts live
in `uploads/private` and are downloaded with a Bearer JWT via
`GET /api/uploads/documents/:filename`; only the owner or an active admin can
download. No token is put in a query string. Unclaimed registration licenses are
admin-only. The license upload response includes `upload_token`, which must be
submitted as `license_upload_token` during broker registration. It is a one-time
claim capability; store it only in form state. Receipt references must belong to
the submitting broker. Frontend document downloads attach the Authorization header.

At startup, legacy root upload files are moved into public/private directories
based on database references. Documents take precedence over photo references;
unreferenced/ambiguous files are quarantined privately. Legacy document URLs are
authenticated. Keep the entire uploads tree on persistent storage; optionally set
`UPLOADS_DIR` to an absolute storage path. Do not expose this tree through another
web server or CDN except its public subdirectory.

Startup and hourly cleanup remove unreferenced files older than 24 hours, with
their metadata. Referenced licenses/receipts/photos are retained, including photos
of soft-deleted listings. Database lookup failure aborts cleanup. Registration
claim locks protect files while attaching a license. Back up storage and database
together. Existing browser/CDN caches of formerly public documents must be purged
separately; moving files cannot revoke previously downloaded copies.

Run security regressions with:

    node --test src/security.test.js

## Durable storage and offline recovery

Production must use absolute paths on persistent mounted storage, for example
`DATABASE_URL=file:/var/lib/marketplace/pilot.db` and
`UPLOADS_DIR=/var/lib/marketplace/uploads` (Windows:
`file:D:/marketplace-data/pilot.db` and `D:/marketplace-data/uploads`).
Relative database paths are relative to `server/prisma`; default database and
upload locations inside the checkout are development-only. Startup emits
`[STORAGE WARNING]` for checkout-local and recognizable temporary/cache paths.
Warnings are heuristic, not proof of mount durability; confirm persistence
across redeploys, container replacement and machine restarts yourself.

From `server/`, after stopping the API, cleanup and all other writers:

```sh
npm run backup -- D:/marketplace-backups --offline
npm run restore -- D:/marketplace-backups/<timestamp-uuid> --offline
```

In Windows PowerShell, use `npm.cmd` instead of `npm` to preserve CLI flags.

Use the exact folder printed by backup. `--offline` is an explicit acknowledgement
that writers are stopped, not an automatic process lock. Backups use a SQLite
snapshot (including committed WAL transactions), the entire uploads tree and a
checksum manifest. Never back up database and uploads at different times while
writers run. The backup root must be outside live data; use separate durable
storage outside the deployment checkout and replicate completed snapshots off-host.
Restrict backup access: private documents, ownership metadata and password hashes
are included. Checksums detect accidental corruption, not malicious modification.

Configure the destination host's environment before restoring. Restore validates
all checksums and SQLite integrity and refuses to overwrite the database, its
`-wal`/`-shm`/`-journal` sidecars, or uploads directory. With writers stopped,
move existing live storage to a safe holding location first. Keep it until the
recovery is verified; interrupted restore output must also be moved aside before
retrying. Restart only after both database and uploads have restored successfully.
Use the matching application version before applying later migrations.
See the README for the full recovery procedure. `npm test` runs a real CLI
backup/delete/restore regression covering SQLite rows and public/private files.
