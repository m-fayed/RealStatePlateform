import { PrismaClient } from '@prisma/client';

// Single shared Prisma client. Import this from anywhere in the server code.
// Reusing one instance keeps the database connection pool healthy.
const prisma = new PrismaClient();

export default prisma;
