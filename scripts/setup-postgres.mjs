/**
 * Setup PostgreSQL database from scratch
 * 
 * Usage:
 *   node scripts/setup-postgres.mjs
 *
 * Prerequisites:
 *   1. A PostgreSQL instance running (Render, local, or cloud)
 *   2. DATABASE_URL environment variable set to PostgreSQL connection string
 *
 * Environment variables:
 *   DATABASE_URL=postgresql://user:password@host:5432/dbname
 *   Optionally in .env file
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Load .env if exists
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  config({ path: envPath })
}

const SCHEMA = join(root, 'prisma', 'schema.postgres.prisma')
const POSTGRES_URL = process.env.DATABASE_URL

async function main() {
  console.log('=== PostgreSQL Setup for GasTrack AR ===\n')

  if (!POSTGRES_URL || !POSTGRES_URL.startsWith('postgresql://')) {
    console.error('ERROR: DATABASE_URL must be set to a PostgreSQL connection string')
    console.error('Example:')
    console.error('  DATABASE_URL=postgresql://user:password@host:5432/gastrack')
    console.error('\nSet it in your .env file or environment.')
    process.exit(1)
  }

  if (!existsSync(SCHEMA)) {
    console.error('ERROR: prisma/schema.postgres.prisma not found')
    process.exit(1)
  }

  console.log('1/4: Generating Prisma client with PostgreSQL schema...')
  execSync(`npx prisma generate --schema="${SCHEMA}"`, { stdio: 'inherit', cwd: root })

  console.log('\n2/4: Pushing schema to PostgreSQL...')
  execSync(`npx prisma db push --schema="${SCHEMA}"`, { stdio: 'inherit', cwd: root })

  console.log('\n3/4: Creating initial migration...')
  try {
    execSync(`npx prisma migrate dev --schema="${SCHEMA}" --name init`, { stdio: 'inherit', cwd: root })
  } catch {
    console.log('   (migration may already exist)')
  }

  console.log('\n4/4: Seeding default data...')
  try {
    execSync(`npx prisma db seed --schema="${SCHEMA}"`, { stdio: 'inherit', cwd: root })
  } catch {
    console.log('   (no seed script or already seeded)')
  }

  console.log('\n✓ PostgreSQL setup complete!')
  console.log('\nNext steps:')
  console.log('  1. Update your Render dashboard with DATABASE_URL')
  console.log('  2. Run: npm run build')
  console.log('  3. For production deployment, use: npm run start:prod')
}

main().catch(console.error)
