import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarMovimientoTubo } from '@/lib/trazabilidad'
import { getRequestUser } from '@/lib/api-auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; cargaId: string }> }) {
  try {
    const { id, cargaId } = await params
    const vehiculo = await db.vehiculo.findUnique({ where: { id } })
    const sesion = await db.cargaVehiculo.findFirstOrThrow({
      where: { id: cargaId, vehiculoId: id, estado: 'ACTIVA' },
      include: { items: { include: { cylinder: true } } },
    })
    const patente = vehiculo?.patente || id
    const user = getRequestUser(request)
    for (const item of sesion.items) {
      await registrarMovimientoTubo({
        cylinderId: item.cylinderId,
        accion: 'CONTROL',
        tipoMovimiento: 'CARGA',
        descripcion: `Cargado en ${patente} (sesión ${cargaId})`,
        estadoAnterior: item.cylinder?.estado || null,
        estadoNuevo: 'EN_REPARTO',
        usuarioId: user?.id || null,
        usuarioNombre: user?.usuario || user?.nombre || null,
        ubicacion: patente,
      })
    }
    await db.cargaVehiculo.update({
      where: { id: cargaId },
      data: { estado: 'COMPLETADA' },
    })
    return NextResponse.json({ success: true, total: sesion.items.length, patente })
  } catch (e) {
    console.error('POST confirmar carga', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}