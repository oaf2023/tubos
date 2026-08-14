import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolverUsuarioOperacion } from '@/lib/api-auth'

const CATALOGO_NOVEDAD = ['TUBO_OTRO_REMITO', 'TUBO_OTRO_CLIENTE', 'GAS_INCORRECTO', 'TUBO_DANIADO', 'PH_VENCIDA', 'FALTANTE', 'SOBRANTE', 'OTRO']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { tipo, detalle, metodoResolucion } = body
    if (!tipo || !CATALOGO_NOVEDAD.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de novedad requerido' }, { status: 400 })
    }
    const remito = await db.remito.findUnique({ where: { id } })
    if (!remito) return NextResponse.json({ error: 'Remito no encontrado' }, { status: 404 })
    if (remito.estado === 'FIRMADO') {
      return NextResponse.json({ error: 'El remito ya está firmado: no se pueden registrar novedades' }, { status: 400 })
    }

    const user = await resolverUsuarioOperacion(req, body)
    const usuarioNombre = user?.nombre || user?.usuario || null

    const novedad = await db.novedadRemito.create({
      data: {
        remitoId: id,
        tipo,
        detalle: detalle?.trim() || null,
        metodoResolucion: metodoResolucion || null,
        usuarioNombre,
      },
    })
    return NextResponse.json({ success: true, novedad })
  } catch (e) {
    console.error('POST /api/remitos/[id]/novedades', e)
    return NextResponse.json({ error: 'Error al registrar novedad' }, { status: 500 })
  }
}