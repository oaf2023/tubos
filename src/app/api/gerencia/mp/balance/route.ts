import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import * as mp from '@/lib/mercadopago'

export async function GET() {
  const session = await requireRole('gerencia')
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const [balance, releases] = await Promise.all([
    mp.getBalance().catch(() => null),
    mp.getReleaseReport().catch(() => null),
  ])
  return NextResponse.json({ balance: balance || {}, releases: releases?.releases || [], isMock: mp.isMock() })
}
