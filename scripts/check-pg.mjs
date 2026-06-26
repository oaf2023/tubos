import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  })
  const tables = await p.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  )
  console.log('Tables in PostgreSQL:')
  tables.forEach(t => console.log('  -', t.table_name))
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
