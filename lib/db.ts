import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient() {
  // Prisma 7: url no longer in schema.prisma; pass via constructor at runtime
  return new PrismaClient({
    log: ['error'],
    datasources: { db: { url: process.env.DATABASE_URL } },
  })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
