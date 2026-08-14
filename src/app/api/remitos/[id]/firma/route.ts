import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { resolverUsuarioOperacion } from '@/lib/api-auth'

const TIPOS_FIRMA = ['PANTALLA_CHOFER', 'PAPEL_FOTO', 'PAPEL_ADMIN']

function esImagenValida(firma: string): boolean {
  if (!firma || typeof firma !== 'string') return false
  return firma.startsWith('data:image') || firma.startsWith('http://') || firma.startsWith('https://')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { firma, nombre, tipoFirma } = body

    if (!TIPOS_FIRMA.includes(tipoFirma)) {
      return NextResponse.json({ error: 'Tipo de firma inválido' }, { status: 400 })
    }
    if (!esImagenValida(firma)) {
      return NextResponse.json({ error: 'La imagen de la firma es obligatoria' }, { status: 400 })
    }

    const user = await resolverUsuarioOperacion(req, body)
    const usuarioNombre = user?.nombre || user?.usuario || null

    const result = await db.$transaction(async (tx) => {
      const remito = await tx.remito.findUniqueOrThrow({ where: { id }, include: { items: true } })
      if (remito.estado === 'FIRMADO') throw new Error('El remito ya está firmado')
      if (!(remito.estado === 'COMPLETADO' || (remito.items.length > 0 && remito.items.every((i) => i.descargado)))) {
        throw new Error('El remito aún no está completo: deben descargarse todos los ítems antes de firmar')
      }
      const firmaToken = remito.firmaToken || randomBytes(16).toString('hex')
      const updated = await tx.remito.update({
        where: { id },
        data: {
          firmaToken,
          firmaCliente: firma,
          firmaNombreCliente: nombre?.trim() || remito.cliente || null,
          firmaFecha: new Date(),
          firmaMetodo: tipoFirma as any,
          firmaCapturadaPor: usuarioNombre,
          estado: 'FIRMADO',
        },
      })
      return updated
    })

    return NextResponse.json({ success: true, estado: result.estado, firmaToken: result.firmaToken })
  } catch (e) {
    console.error('POST /api/remitos/[id]/firma', e)
    const msg = e instanceof Error ? e.message : 'Error al registrar firma'
    return NextResponse.json({ error: msg }, { status: msg.includes('ya') ? 409 : 400 })
  }
}