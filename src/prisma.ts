import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

try {
  prisma = new PrismaClient();
} catch {
  console.warn('Prisma client could not be initialized. DB features disabled.');
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not available');
  }
  return prisma;
}

export default prisma;
