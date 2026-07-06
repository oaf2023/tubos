import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createComprobante, ensureDefaultComprobanteConfig, serializeComprobante } from '@/lib/services/comprobante-service'

export async function GET(req: NextRequest) {
  try {
    await ensureDefaultComprobanteConfig()
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo') || 'all'
    const estado = searchParams.get('estado') || 'all'
    const search = searchParams.get('search') || ''
    const where: any = {}
    if (tipo !== 'all') {
      if (tipo === 'FACTURAS') where.tipoDocumento = 'FACTURA'
      else if (tipo === 'NOTAS_CREDITO') where.tipoDocumento = 'NOTA_CREDITO'
      else if (tipo === 'REMITOS') where.tipoDocumento = 'REMITO'
      else if (tipo === 'PRESUPUESTOS') where.tipoDocumento = 'PRESUPUESTO'
      else if (tipo === 'ORDEN_INTERNA') where.tipoDocumento = 'ORDEN_INTERNA'
      else where.tipoDocumento = tipo
    }
    if (estado !== 'all') where.estado = estado
    if (search.trim()) where.OR = [
      { clienteNombre: { contains: search.trim(), mode: 'insensitive' } },
      { numeroFormateado: { contains: search.trim(), mode: 'insensitive' } },
    ]
    const data = await db.documentoComercial.findMany({ where, orderBy: { createdAt: 'desc' }, include: { items: true, tributos: true }, take: 300 })
    return NextResponse.json(data.map(serializeComprobante))
  } catch (e) {
    console.error('GET /api/comprobantes', e)
    return NextResponse.json({ error: 'Error al obtener comprobantes' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const doc = await createComprobante(body)
    return NextResponse.json(serializeComprobante(doc), { status: 201 })
  } catch (e) {
    console.error('POST /api/comprobantes', e)
    return NextResponse.json({ error: 'Error al crear comprobante' }, { status: 500 })
  }
}
