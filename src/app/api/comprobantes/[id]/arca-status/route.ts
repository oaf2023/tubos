import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: any) {
  try {
    const doc = await db.documentoComercial.findUnique({
      where: { id: params.id },
      include: { items: true, tributos: true },
    })
    if (!doc) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
    }

    const logs = await db.arcaRequestLog.findMany({
      where: { documentoId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      id: doc.id,
      estado: doc.estado,
      cae: doc.cae,
      caeVencimiento: doc.caeVencimiento,
      fiscal: doc.fiscal,
      tieneCae: !!doc.cae,
      autorizado: doc.estado === 'AUTORIZADO',
      logs: logs.map(l => ({
        id: l.id,
        tipoOperacion: l.tipoOperacion,
        resultado: l.resultado,
        cae: l.cae,
        mensajeError: l.mensajeError,
        duracionMs: l.duracionMs,
        modo: l.modo,
        createdAt: l.createdAt,
      })),
    })
  } catch (e) {
    console.error('GET /api/comprobantes/[id]/arca-status', e)
    return NextResponse.json({ error: 'Error al consultar estado ARCA' }, { status: 500 })
  }
}
