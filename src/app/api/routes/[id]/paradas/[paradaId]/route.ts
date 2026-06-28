import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getFirstGasId(): Promise<string | null> {
  const gas = await db.gas.findFirst({ orderBy: { codigo: 'asc' }, select: { id: true, codigo: true } })
  return gas?.id ?? null
}

// PUT /api/routes/[id]/paradas/[paradaId] - actualizar estado de parada
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paradaId: string }> }
) {
  try {
    const { id, paradaId } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (body.estado !== undefined) data.estado = body.estado
    if (body.notas !== undefined) data.notas = body.notas
    if (body.llegada === true) data.llegada = new Date()
    if (body.salida === true) data.salida = new Date()

    const parada = await db.rutaParada.update({
      where: { id: paradaId },
      data,
      include: { cliente: true },
    })

    // Generate remito when parada is marked ENTREGADO and has clienteId
    if (body.estado === 'ENTREGADO' && parada.clienteId) {
      const ultimoRemito = await db.remito.findFirst({
        orderBy: { numero: 'desc' },
        select: { numero: true },
      })
      const nextNumero = (ultimoRemito?.numero ?? 0) + 1
      const defaultGasId = await getFirstGasId()

      await db.remito.create({
        data: {
          numero: nextNumero,
          clienteId: parada.clienteId,
          cliente: parada.nombre,
          fecha: new Date(),
          tipo: (parada.tipoOperacion === 'RETIRO' ? 'DEVOLUCION' : 'ENTREGA') as any,
          estado: 'COMPLETADO',
          observaciones: `Generado desde ruta - Parada #${parada.orden}`,
          items: defaultGasId && parada.demandaTubos
            ? {
                create: [{
                  gasId: defaultGasId,
                  gasCodigo: 'VAR',
                  tipoOperacion: parada.tipoOperacion === 'RETIRO' ? 'DEVOLUCION' : 'ALQUILER',
                  cantidad: parada.demandaTubos,
                }],
              }
            : undefined,
        },
      })
    }

    // Check if all paradas are delivered
    if (body.estado === 'ENTREGADO') {
      const allParadas = await db.rutaParada.findMany({
        where: { rutaId: id },
        orderBy: { orden: 'asc' },
      })
      const completed = allParadas.filter((p) => p.estado === 'ENTREGADO')

      // Auto-complete route if all delivered
      if (completed.length === allParadas.length) {
        await db.ruta.update({
          where: { id },
          data: { estado: 'COMPLETADA' },
        })
      }
    }

    return NextResponse.json(parada)
  } catch (e) {
    console.error('PUT /api/routes/[id]/paradas/[paradaId]', e)
    return NextResponse.json({ error: 'Error al actualizar parada' }, { status: 500 })
  }
}

// GET /api/routes/[id]/paradas/[paradaId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; paradaId: string }> }
) {
  try {
    const { paradaId } = await params
    const parada = await db.rutaParada.findUnique({ where: { id: paradaId } })
    if (!parada) {
      return NextResponse.json({ error: 'Parada no encontrada' }, { status: 404 })
    }
    return NextResponse.json(parada)
  } catch (e) {
    console.error('GET /api/routes/[id]/paradas/[paradaId]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
