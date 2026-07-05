import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import * as ml from '@/lib/mercadolibre'

export async function GET(request: NextRequest) {
  const roleCheck = await requireRole('gerencia')(request)
  if (roleCheck) return roleCheck
  const data = await ml.getClaims()
  return NextResponse.json({ claims: data || [], isMock: ml.isMock() })
}
