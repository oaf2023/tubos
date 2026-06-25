import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; cargaId: string }> }) {
  try {
    const { id, cargaId } = await params
    const sesion = await db.cargaVehiculo.findFirstOrThrow({
      where: { id: cargaId, vehiculoId: id, estado: 'ACTIVA' },
      include: { items: { include: { cylinder: true } } },
    })
    // Create CylinderMovimiento for each item
    for (const item of sesion.items) {
      await db.cylinderMovimiento.create({
        data: {
          cylinderId: item.cylinderId,
          tipo: 'CARGA',
          descripcion: `Cargado en vehículo ${sesion.vehiculoId} (sesión ${cargaId})`,
          ubicacion: `Vehículo ${id}`,
        },
      })
      await db.cylinder.update({
        where: { id: item.cylinderId },
        data: { estado: 'EN_USO' },
      })
    }
    await db.cargaVehiculo.update({
      where: { id: cargaId },
      data: { estado: 'COMPLETADA' },
    })
    return NextResponse.json({ success: true, total: sesion.items.length })
  } catch (e) {
    console.error('POST confirmar carga', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
