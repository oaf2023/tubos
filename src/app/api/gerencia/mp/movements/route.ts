import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import * as mp from '@/lib/mercadopago'

export async function GET() {
  const session = await requireRole('gerencia')
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const data = await mp.getAccountMovements()
  return NextResponse.json({ movements: data || [], isMock: mp.isMock() })
}
