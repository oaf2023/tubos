import { NextRequest, NextResponse } from 'next/server'
import { getCylinderHistory } from '@/lib/neo4j'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const history = await getCylinderHistory(id)
    return NextResponse.json(history)
  } catch (e) {
    console.error('GET historial', e)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }
}
