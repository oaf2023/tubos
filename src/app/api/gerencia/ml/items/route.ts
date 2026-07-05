import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import * as ml from '@/lib/mercadolibre'

export async function GET() {
  const session = await requireRole('gerencia')
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const data = await ml.getItems()
  return NextResponse.json({ items: data || [], isMock: ml.isMock() })
}
