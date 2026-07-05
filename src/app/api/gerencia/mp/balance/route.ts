import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import * as mp from '@/lib/mercadopago'

export async function GET(request: NextRequest) {
  const roleCheck = await requireRole('gerencia')(request)
  if (roleCheck) return roleCheck
  const [balance, releases] = await Promise.all([
    mp.getBalance().catch(() => null),
    mp.getReleaseReport().catch(() => null),
  ])
  return NextResponse.json({ balance: balance || {}, releases: releases?.releases || [], isMock: mp.isMock() })
}
