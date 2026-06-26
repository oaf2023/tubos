/**
 * Switch database provider: sqlite (dev) or postgresql (prod)
 *
 * Usage:
 *   node scripts/switch-db.mjs sqlite    → uses prisma/schema.prisma (SQLite)
 *   node scripts/switch-db.mjs postgres  → uses prisma/schema.postgres.prisma (PostgreSQL)
 *
 * After switching, run: npx prisma generate
 */

import { copyFileSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const TARGET = process.argv[2]?.toLowerCase()

if (!TARGET || !['sqlite', 'postgres'].includes(TARGET)) {
  console.error('Usage: node scripts/switch-db.mjs <sqlite|postgres>')
  process.exit(1)
}

const POSTGRES_SCHEMA = join(root, 'prisma', 'schema.postgres.prisma')
const SQLITE_SCHEMA = join(root, 'prisma', 'schema.prisma')
const ACTIVE_SCHEMA = join(root, 'prisma', 'schema.active.prisma')

if (TARGET === 'postgres') {
  if (!existsSync(POSTGRES_SCHEMA)) {
    console.error('ERROR: prisma/schema.postgres.prisma not found')
    process.exit(1)
  }
  copyFileSync(POSTGRES_SCHEMA, ACTIVE_SCHEMA)
  console.log('✓ Switched to PostgreSQL schema (schema.active.prisma)')
} else {
  copyFileSync(SQLITE_SCHEMA, ACTIVE_SCHEMA)
  console.log('✓ Switched to SQLite schema (schema.active.prisma)')
}

console.log(`Run: npx prisma generate --schema=prisma/schema.active.prisma`)
