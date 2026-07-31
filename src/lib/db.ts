import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  const relativePath = dbUrl.replace('file:', '');
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(process.cwd(), relativePath);

  const adapter = new PrismaBetterSqlite3({ url: absolutePath });
  return new PrismaClient({ adapter });
}

// In development, create a fresh client to pick up schema changes instantly
export const db = process.env.NODE_ENV === 'production'
  ? (globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient()))
  : createPrismaClient();
