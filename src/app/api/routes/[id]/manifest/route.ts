import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ruta = await db.ruta.findUnique({
      where: { id },
      include: {
        paradas: { orderBy: { orden: 'asc' } },
        vehicle: { select: { patente: true, marca: true, modelo: true, maxTubos: true } },
      },
    })

    if (!ruta) {
      return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })
    }

    const completadas = ruta.paradas.filter(p => p.estado === 'ENTREGADO').length
    const pendientes = ruta.paradas.filter(p => p.estado !== 'ENTREGADO')
    const totalTubos = ruta.paradas.reduce((sum, p) => sum + (p.demandaTubos || 0), 0)
    const entregadosTubos = ruta.paradas.filter(p => p.estado === 'ENTREGADO').reduce((sum, p) => sum + (p.demandaTubos || 0), 0)

    const manifest = {
      ruta: {
        id: ruta.id,
        nombre: ruta.nombre,
        fecha: ruta.fecha,
        estado: ruta.estado,
        origen: { nombre: ruta.origenNombre, lat: ruta.origenLat, lng: ruta.origenLng },
        distanciaKm: ruta.distanciaKm,
        duracionHoras: ruta.duracionHoras,
        costoPorKm: ruta.costoPorKm,
        costoTotal: ruta.costoTotal,
        navigationToken: ruta.navigationToken,
        navigationStartedAt: ruta.navigationStartedAt,
      },
      vehicle: ruta.vehicle ? {
        patente: ruta.vehicle.patente,
        marca: ruta.vehicle.marca,
        modelo: ruta.vehicle.modelo,
        maxTubos: ruta.vehicle.maxTubos,
      } : null,
      resumen: {
        totalParadas: ruta.paradas.length,
        completadas,
        pendientes: pendientes.length,
        totalTubos,
        entregadosTubos,
        pendientesTubos: totalTubos - entregadosTubos,
      },
      paradas: ruta.paradas.map(p => ({
        orden: p.orden,
        nombre: p.nombre,
        provincia: p.provincia,
        lat: p.lat,
        lng: p.lng,
        estado: p.estado,
        tipoOperacion: p.tipoOperacion,
        demandaTubos: p.demandaTubos,
        notas: p.notas,
        notasConductor: p.notasConductor,
        fotoUrl: p.fotoUrl,
        llegada: p.llegada,
        salida: p.salida,
      })),
    }

    return NextResponse.json(manifest)
  } catch (e) {
    console.error('GET /api/routes/[id]/manifest', e)
    return NextResponse.json({ error: 'Error al generar manifiesto' }, { status: 500 })
  }
}
