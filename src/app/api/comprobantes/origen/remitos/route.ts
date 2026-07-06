import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serializeComprobante } from '@/lib/services/comprobante-service'

export async function GET(req: NextRequest) {
  try {
    const clienteId = new URL(req.url).searchParams.get('clienteId') || undefined
    const data = await db.remito.findMany({
      where: clienteId ? { clienteId } : {},
      include: { items: true },
      orderBy: { fecha: 'desc' },
      take: 100,
    })
    return NextResponse.json(data.map(serializeComprobante))
  } catch (e) {
    console.error('GET /api/comprobantes/origen/remitos', e)
    return NextResponse.json({ error: 'Error al obtener remitos' }, { status: 500 })
  }
}
