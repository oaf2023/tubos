import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; cargaId: string }> }) {
  try {
    const { id, cargaId } = await params
    const sesion = await db.cargaVehiculo.findFirstOrThrow({
      where: { id: cargaId, vehiculoId: id },
      include: { items: { include: { cylinder: true } } },
    })
    for (const item of sesion.items) {
      await db.cylinderMovimiento.create({
        data: {
          cylinderId: item.cylinderId,
          tipo: 'DESCARGA',
          descripcion: `Descargado de vehículo (sesión ${cargaId})`,
          ubicacion: 'Depósito',
        },
      })
      await db.cylinder.update({
        where: { id: item.cylinderId },
        data: { estado: 'VACIO' },
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
