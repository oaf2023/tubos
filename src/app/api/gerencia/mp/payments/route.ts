import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import * as mp from '@/lib/mercadopago'

export async function GET(request: NextRequest) {
  const roleCheck = await requireRole('gerencia')(request)
  if (roleCheck) return roleCheck
  const data = await mp.getPayments()
  return NextResponse.json({ payments: data || [], isMock: mp.isMock() })
}
