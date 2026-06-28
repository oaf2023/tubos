import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/chofer/activos — Lista choferes en línea (para dashboard)
export async function GET() {
  try {
    const threshold = new Date(Date.now() - 5 * 60 * 1000) // 5 min sin heartbeat = offline

    // Marcar como offline los que excedieron el threshold
    await db.sesionConductor.updateMany({
      where: {
        estaEnLinea: true,
        ultimoHeartbeat: { lt: threshold },
      },
      data: { estaEnLinea: false },
    })

    const sesiones = await db.sesionConductor.findMany({
      where: { estaEnLinea: true },
      include: {
        conductor: {
          select: { id: true, nombre: true, usuario: true, telefono: true },
        },
        ruta: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            distanciaKm: true,
            vehicle: { select: { patente: true, marca: true, modelo: true } },
            paradas: {
              where: { estado: { not: 'ENTREGADO' } },
              select: { id: true, nombre: true },
            },
          },
        },
      },
      orderBy: { ultimoHeartbeat: 'desc' },
    })

    return NextResponse.json(
      sesiones.map((s) => ({
        id: s.id,
        conductor: s.conductor,
        ruta: s.ruta,
        lat: s.lat,
        lng: s.lng,
        velocidad: s.velocidad,
        ultimoHeartbeat: s.ultimoHeartbeat,
        paradasPendientes: s.ruta?.paradas?.length ?? 0,
        tiempoOfflineMin: Math.round(
          (Date.now() - s.ultimoHeartbeat.getTime()) / 60000
        ),
      }))
    )
  } catch (e) {
    console.error('GET /api/chofer/activos', e)
    return NextResponse.json({ error: 'Error al obtener choferes activos' }, { status: 500 })
  }
}
