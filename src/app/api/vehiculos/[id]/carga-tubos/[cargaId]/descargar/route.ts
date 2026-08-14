import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarMovimientoTubo } from '@/lib/trazabilidad'
import { getRequestUser } from '@/lib/api-auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; cargaId: string }> }) {
  try {
    const { id, cargaId } = await params
    const sesion = await db.cargaVehiculo.findFirstOrThrow({
      where: { id: cargaId, vehiculoId: id },
      include: { items: { include: { cylinder: true } } },
    })
    const user = getRequestUser(request)
    for (const item of sesion.items) {
      await registrarMovimientoTubo({
        cylinderId: item.cylinderId,
        accion: 'DEVOLUCION',
        tipoMovimiento: 'DESCARGA',
        descripcion: `Descargado de vehículo (sesión ${cargaId})`,
        estadoAnterior: item.cylinder?.estado || null,
        estadoNuevo: 'VACIO',
        usuarioId: user?.id || null,
        usuarioNombre: user?.usuario || user?.nombre || null,
        ubicacion: 'Depósito',
      })
    }
    await db.cargaVehiculo.update({
      where: { id: cargaId },
      data: { estado: 'COMPLETADA' },
    })
    return NextResponse.json({ success: true, total: sesion.items.length })
  } catch (e) {
    console.error('POST descargar', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}