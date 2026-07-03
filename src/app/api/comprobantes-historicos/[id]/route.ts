import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: any) {
  try {
    const { id } = params
    const comprobante = await db.comprobanteHistorico.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    if (!comprobante) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(comprobante)
  } catch (e) {
    console.error('GET /api/comprobantes-historicos/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
