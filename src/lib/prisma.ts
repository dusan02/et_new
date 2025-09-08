import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Ensure DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'], // dev: ['query','info','warn','error']
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
