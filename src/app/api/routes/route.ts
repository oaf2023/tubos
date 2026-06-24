import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { osrmTrip } from '@/lib/routing'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// GET /api/routes
export async function GET() {
  try {
    const routes = await db.ruta.findMany({
      include: { paradas: { orderBy: { orden: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(routes)
  } catch (e) {
    console.error('GET /api/routes', e)
    return NextResponse.json({ error: 'Error al obtener rutas' }, { status: 500 })
  }
}

// POST /api/routes - create route with OSRM real distances if available
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, origenNombre, origenLat, origenLng, paradas, distanciaReal, duracionReal } = body

    if (!nombre || !paradas || !Array.isArray(paradas) || paradas.length === 0) {
      return NextResponse.json({ error: 'Faltan campos: nombre, paradas' }, { status: 400 })
    }

    const oLat = parseFloat(origenLat)
    const oLng = parseFloat(origenLng)

    // 1. Try OSRM real distance (if not pre-computed)
    let finalKm = 0
    let finalHoras = 0
    let fuente = 'haversine'

    if (distanciaReal && duracionReal) {
      finalKm = distanciaReal
      finalHoras = duracionReal
      fuente = 'precalculada (OSRM)'
    } else {
      try {
        const tripPoints = [
          { lat: oLat, lng: oLng },
          ...paradas.map((p: any) => ({ lat: p.lat, lng: p.lng })),
          { lat: oLat, lng: oLng },
        ]
        const osrm = await osrmTrip(tripPoints)
        if (osrm) {
          finalKm = osrm.distanceKm
          finalHoras = Math.round((osrm.durationMin / 60) * 10) / 10
          fuente = 'OSRM'
        }
      } catch {
        // fall through to Haversine
      }
    }

    // 2. Fallback to Haversine
    if (finalKm === 0) {
      let total = 0
      let ant = { lat: oLat, lng: oLng }
      for (const p of paradas) {
        total += haversineKm(ant.lat, ant.lng, p.lat, p.lng)
        ant = { lat: p.lat, lng: p.lng }
      }
      total += haversineKm(ant.lat, ant.lng, oLat, oLng)
      finalKm = Math.round(total * 10) / 10
      finalHoras = Math.round((total / 70) * 10) / 10
    }

    const ruta = await db.ruta.create({
      data: {
        nombre,
        estado: 'PLANIFICADA',
        origenNombre,
        origenLat: oLat,
        origenLng: oLng,
        distanciaKm: finalKm,
        duracionHoras: finalHoras,
        paradas: {
          create: paradas.map((p: any, idx: number) => ({
            orden: idx + 1,
            lat: p.lat,
            lng: p.lng,
            nombre: p.nombre,
            provincia: p.provincia,
            cylinderIds: p.cylinderIds || '',
            estado: 'PENDIENTE',
            notas: p.notas || null,
          })),
        },
      },
      include: { paradas: { orderBy: { orden: 'asc' } } },
    })

    return NextResponse.json({ ...ruta, _fuente: fuente }, { status: 201 })
  } catch (e) {
    console.error('POST /api/routes', e)
    return NextResponse.json({ error: 'Error al crear ruta' }, { status: 500 })
  }
}
