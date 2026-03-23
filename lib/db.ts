import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient() {
  // Prisma 7: URL is configured in prisma.config.ts, not passed to the constructor
  return new PrismaClient({ log: ['error'] })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
