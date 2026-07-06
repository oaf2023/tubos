import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireGerenciaNivel0 } from '@/lib/api-auth'
import { ensureDefaultComprobanteConfig, serializeComprobante } from '@/lib/services/comprobante-service'

export async function GET() {
  try {
    await ensureDefaultComprobanteConfig()
    const data = await db.documentoNumerador.findMany({ orderBy: [{ tipoDocumento: 'asc' }, { letra: 'asc' }, { puntoVenta: 'asc' }] })
    return NextResponse.json(data.map(serializeComprobante))
  } catch (e) {
    console.error('GET /api/comprobantes/numeradores', e)
    return NextResponse.json({ error: 'Error al obtener numeradores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const forbidden = requireGerenciaNivel0(req)
  if (forbidden) return forbidden
  try {
    const b = await req.json()
    const created = await db.documentoNumerador.create({
      data: {
        tipoDocumento: b.tipoDocumento,
        letra: b.letra,
        codigoComprobante: b.codigoComprobante || '00',
        abreviatura: b.abreviatura,
        puntoVenta: b.puntoVenta,
        ultimoNumero: Number(b.ultimoNumero || 0),
        fiscal: Boolean(b.fiscal),
        sinValidezFiscal: Boolean(b.sinValidezFiscal),
        copias: b.copias || 'ORIGINAL,DUPLICADO',
        activo: b.activo !== false,
      },
    })
    return NextResponse.json(serializeComprobante(created), { status: 201 })
  } catch (e) {
    console.error('POST /api/comprobantes/numeradores', e)
    return NextResponse.json({ error: 'Error al crear numerador' }, { status: 500 })
  }
}
