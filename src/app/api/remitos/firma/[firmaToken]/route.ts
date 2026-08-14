import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ firmaToken: string }> }) {
  try {
    const { firmaToken } = await params
    const remito = await db.remito.findUnique({
      where: { firmaToken },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    if (!remito) return NextResponse.json({ error: 'Remito no encontrado' }, { status: 404 })
    return NextResponse.json({
      numero: remito.numero,
      cliente: remito.cliente,
      tecnico: remito.tecnico,
      fecha: remito.fecha,
      estado: remito.estado,
      firmado: Boolean(remito.firmaCliente),
      totalItems: remito.items.length,
      descargados: remito.items.filter((i) => i.descargado).length,
      items: remito.items.map((i) => ({
        numeroSerie: i.numeroSerie,
        gasCodigo: i.gasCodigo,
        cantidad: i.cantidad,
        descargado: i.descargado,
      })),
    })
  } catch (e) {
    console.error('GET /api/remitos/firma/[firmaToken]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ firmaToken: string }> }) {
  try {
    const { firmaToken } = await params
    const body = await req.json()
    const { firma, nombre } = body

    if (!firma || typeof firma !== 'string' || !firma.startsWith('data:image')) {
      return NextResponse.json({ error: 'La imagen de la firma es obligatoria' }, { status: 400 })
    }
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'Debe ingresar el nombre de quien firma' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      const remito = await tx.remito.findUnique({ where: { firmaToken } })
      if (!remito) throw new Error('Remito no encontrado')
      if (remito.estado === 'FIRMADO') throw new Error('Este remito ya fue firmado')
      const items = await tx.remitoItem.findMany({ where: { remitoId: remito.id } })
      if (!(remito.estado === 'COMPLETADO' || (items.length > 0 && items.every((i) => i.descargado)))) {
        throw new Error('El remito aún no está completo: deben descargarse todos los ítems antes de firmar')
      }
      const updated = await tx.remito.update({
        where: { id: remito.id },
        data: {
          firmaCliente: firma,
          firmaNombreCliente: nombre.trim(),
          firmaFecha: new Date(),
          firmaMetodo: 'PANTALLA_CLIENTE',
          firmaCapturadaPor: null,
          estado: 'FIRMADO',
        },
      })
      return updated
    })

    return NextResponse.json({ success: true, estado: result.estado })
  } catch (e) {
    console.error('POST /api/remitos/firma/[firmaToken]', e)
    const msg = e instanceof Error ? e.message : 'Error al registrar firma'
    return NextResponse.json({ error: msg }, { status: msg.includes('ya fue') ? 409 : msg.includes('no encontrado') ? 404 : 400 })
  }
}