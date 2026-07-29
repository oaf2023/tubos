import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrisma() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

  // Keep-alive: evita que Render cierre conexiones inactivas
  setInterval(() => {
    client.$queryRaw`SELECT 1`.catch(() => {})
  }, 30_000)

  return client
}

export const db =
  globalForPrisma.prisma ??
  createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db