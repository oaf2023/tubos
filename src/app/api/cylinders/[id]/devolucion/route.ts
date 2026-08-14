import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarMovimientoTubo, motivoDevolucionAEstado } from '@/lib/trazabilidad'
import { getRequestUser } from '@/lib/api-auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { motivo, observacion, latitud, longitud, ubicacion, remitoId } = body

    if (!motivo) {
      return NextResponse.json({ error: 'Motivo de devolución requerido' }, { status: 400 })
    }

    const user = getRequestUser(req)
    const usuarioNombre = user?.nombre || user?.usuario || null

    const result = await db.$transaction(async (tx) => {
      const cylinder = await tx.cylinder.findUnique({ where: { id } })
      if (!cylinder) throw new Error('Tubo no encontrado')

      let itemActualizado: any = null
      if (remitoId) {
        itemActualizado = await tx.remitoItem.findFirst({
          where: { remitoId, cylinderId: id },
        })
      }
      if (!itemActualizado) {
        itemActualizado = await tx.remitoItem.findFirst({
          where: { cylinderId: id, remito: { tipo: 'ENTREGA' } },
          orderBy: { remito: { createdAt: 'desc' } },
        })
      }

      if (itemActualizado) {
        await tx.remitoItem.update({
          where: { id: itemActualizado.id },
          data: {
            fechaDevolucion: new Date(),
            motivoDevolucion: motivo,
            devolucionRegistradaPor: usuarioNombre || 'anónimo',
            tipoOperacion: 'DEVOLUCION',
          },
        })
      }

      const estadoNuevo = motivoDevolucionAEstado(motivo)

      await registrarMovimientoTubo(
        {
          cylinderId: id,
          accion: 'DEVOLUCION',
          tipoMovimiento: 'DEVOLUCION',
          descripcion: `Devolución${itemActualizado ? ` remito N°${itemActualizado.remitoId}` : ''} (${motivo})`,
          estadoAnterior: cylinder.estado,
          estadoNuevo,
          clienteId: null,
          clienteNombre: null,
          usuarioId: user?.id || null,
          usuarioNombre,
          observacion: observacion || null,
          ubicacion: ubicacion || 'Depósito',
          lat: latitud ? parseFloat(latitud) : null,
          lng: longitud ? parseFloat(longitud) : null,
          remitoId: itemActualizado?.remitoId || remitoId || null,
          origen: 'PORTAL_UHF',
        },
        tx,
      )

      return { estadoNuevo, itemActualizado: Boolean(itemActualizado) }
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('POST /api/cylinders/[id]/devolucion', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al registrar devolución' }, { status: 500 })
  }
}