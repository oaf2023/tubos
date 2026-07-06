import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireGerenciaNivel0 } from '@/lib/api-auth'
import { serializeComprobante } from '@/lib/services/comprobante-service'

export async function PUT(req: NextRequest, { params }: any) {
  const forbidden = requireGerenciaNivel0(req)
  if (forbidden) return forbidden
  try {
    const b = await req.json()
    const updated = await db.documentoNumerador.update({
      where: { id: params.id },
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
    return NextResponse.json(serializeComprobante(updated))
  } catch (e) {
    console.error('PUT /api/comprobantes/numeradores/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar numerador' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: any) {
  const forbidden = requireGerenciaNivel0(req)
  if (forbidden) return forbidden
  try {
    await db.documentoNumerador.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/comprobantes/numeradores/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar numerador' }, { status: 500 })
  }
}
