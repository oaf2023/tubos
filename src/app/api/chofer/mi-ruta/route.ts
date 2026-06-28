import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/chofer/mi-ruta?token=xxx — Devuelve la ruta activa del chofer autenticado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const session = await db.sesionConductor.findUnique({
      where: { token },
      include: { conductor: true },
    })

    if (!session || !session.estaEnLinea) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 })
    }

    // Actualizar heartbeat
    await db.sesionConductor.update({
      where: { id: session.id },
      data: { ultimoHeartbeat: new Date() },
    })

    // Buscar ruta activa
    const ruta = await db.ruta.findFirst({
      where: {
        conductorId: session.conductorId,
        estado: 'EN_PROGRESO',
      },
      include: {
        paradas: {
          orderBy: { orden: 'asc' },
        },
        vehicle: true,
      },
      orderBy: { navigationStartedAt: 'desc' },
    })

    if (!ruta) {
      return NextResponse.json({ ruta: null })
    }

    return NextResponse.json({
      ruta: {
        id: ruta.id,
        nombre: ruta.nombre,
        estado: ruta.estado,
        distanciaKm: ruta.distanciaKm,
        duracionHoras: ruta.duracionHoras,
        paradas: ruta.paradas.map((p) => ({
          id: p.id,
          orden: p.orden,
          nombre: p.nombre,
          lat: p.lat,
          lng: p.lng,
          provincia: p.provincia,
          estado: p.estado,
          demandaTubos: p.demandaTubos,
          tipoOperacion: p.tipoOperacion,
          cylinderIds: p.cylinderIds,
          clienteId: p.clienteId,
        })),
        vehicle: ruta.vehicle ? {
          patente: ruta.vehicle.patente,
          marca: ruta.vehicle.marca,
          modelo: ruta.vehicle.modelo,
        } : null,
      },
    })
  } catch (e) {
    console.error('GET /api/chofer/mi-ruta', e)
    return NextResponse.json({ error: 'Error al obtener ruta' }, { status: 500 })
  }
}
