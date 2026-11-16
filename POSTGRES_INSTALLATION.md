# Retired database setup guide

This historical filename is retained for existing links. The current application uses **SQLite through Prisma**, so no external database service installation is required.

Follow [current setup](my-marketplace/README.md) for DATABASE_URL, migrations, client generation and explicit admin seeding. See [current schema](DATABASE_SCHEMA.md). A future database-provider migration would require deliberate schema, migration and test changes; it is not part of the current setup.
