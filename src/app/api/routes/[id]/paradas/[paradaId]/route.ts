import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function getFirstGasId(tx?: typeof db): Promise<string | null> {
  const client = tx || db
  const gas = await client.gas.findFirst({ orderBy: { codigo: 'asc' }, select: { id: true, codigo: true } })
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

    const parada = await db.$transaction(async (tx) => {
      const data: Record<string, unknown> = {}
      if (body.estado !== undefined) data.estado = body.estado
      if (body.notas !== undefined) data.notas = body.notas
      if (body.fotoUrl !== undefined) data.fotoUrl = body.fotoUrl
      if (body.notasConductor !== undefined) data.notasConductor = body.notasConductor
      if (body.llegada === true) data.llegada = new Date()
      if (body.salida === true) data.salida = new Date()

      const p = await tx.rutaParada.update({
        where: { id: paradaId },
        data,
        include: { cliente: true },
      })

      if (body.estado === 'ENTREGADO' && p.clienteId) {
        const ultimoRemito = await tx.remito.findFirst({
          orderBy: { numero: 'desc' },
          select: { numero: true },
        })
        const nextNumero = (ultimoRemito?.numero ?? 0) + 1
        const defaultGasId = await getFirstGasId(tx)

        await tx.remito.create({
          data: {
            numero: nextNumero,
            clienteId: p.clienteId,
            cliente: p.nombre,
            fecha: new Date(),
            tipo: (p.tipoOperacion === 'RETIRO' ? 'DEVOLUCION' : 'ENTREGA') as any,
            estado: 'COMPLETADO',
            observaciones: body.notasConductor
              ? `Generado desde ruta - Parada #${p.orden} - Nota: ${body.notasConductor}`
              : `Generado desde ruta - Parada #${p.orden}`,
            items: defaultGasId && p.demandaTubos
              ? {
                  create: [{
                    gasId: defaultGasId,
                    gasCodigo: 'VAR',
                    tipoOperacion: p.tipoOperacion === 'RETIRO' ? 'DEVOLUCION' : 'ALQUILER',
                    cantidad: p.demandaTubos,
                  }],
                }
              : undefined,
          },
        })
      }

      if (body.estado === 'ENTREGADO') {
        const allParadas = await tx.rutaParada.findMany({
          where: { rutaId: id },
          orderBy: { orden: 'asc' },
        })
        const completed = allParadas.filter((p2) => p2.estado === 'ENTREGADO')

        if (completed.length === allParadas.length) {
          await tx.ruta.update({
            where: { id },
            data: { estado: 'COMPLETADA' },
          })
        }
      }

      return p
    })

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
