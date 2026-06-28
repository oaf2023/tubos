import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/chofer/heartbeat — Actualiza última conexión + ubicación del chofer
export async function POST(request: NextRequest) {
  try {
    const { token, lat, lng, velocidad } = await request.json()

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

    const updateData: Record<string, unknown> = {
      ultimoHeartbeat: new Date(),
    }
    if (lat !== undefined) updateData.lat = lat
    if (lng !== undefined) updateData.lng = lng
    if (velocidad !== undefined) updateData.velocidad = velocidad

    await db.sesionConductor.update({
      where: { id: session.id },
      data: updateData as any,
    })

    // También registrar ping GPS si tiene ruta activa
    if (session.rutaId && lat !== undefined && lng !== undefined) {
      await db.ubicacionGPS.create({
        data: {
          rutaId: session.rutaId,
          vehiculoId: null,
          lat,
          lng,
          velocidad: velocidad || null,
          fuente: 'GPS_CHOFER',
        },
      }).catch(() => {})
    }

    // Si hay una ruta activa, devolver actualizaciones
    if (session.rutaId) {
      const ruta = await db.ruta.findUnique({
        where: { id: session.rutaId },
        include: {
          paradas: {
            where: { estado: { not: 'ENTREGADO' } },
            orderBy: { orden: 'asc' },
          },
        },
      })
      if (ruta) {
        return NextResponse.json({
          ok: true,
          ruta: {
            id: ruta.id,
            estado: ruta.estado,
            paradasPendientes: ruta.paradas.map((p) => ({
              id: p.id,
              orden: p.orden,
              nombre: p.nombre,
              lat: p.lat,
              lng: p.lng,
              demandaTubos: p.demandaTubos,
            })),
          },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/chofer/heartbeat', e)
    return NextResponse.json({ error: 'Error en heartbeat' }, { status: 500 })
  }
}
