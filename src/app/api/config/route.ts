import { NextResponse } from 'next/server'
import { COMPANY_CONFIG, NEO4J_CONFIG } from '@/lib/config'

// GET /api/config - configuración pública de la empresa
export async function GET() {
  return NextResponse.json({
    company: COMPANY_CONFIG,
    neo4jEnabled: NEO4J_CONFIG.enabled,
  })
}
