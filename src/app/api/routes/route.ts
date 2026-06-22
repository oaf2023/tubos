import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Distancia Haversine en km
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

// GET /api/routes - listar todas las rutas
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

// POST /api/routes - crear una nueva ruta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, origenNombre, origenLat, origenLng, paradas } = body

    if (!nombre || !paradas || !Array.isArray(paradas) || paradas.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos: nombre, paradas' },
        { status: 400 }
      )
    }

    // Calcular distancia total: origen -> parada1 -> parada2 -> ... -> origen
    let distanciaTotal = 0
    let anterior = { lat: parseFloat(origenLat), lng: parseFloat(origenLng) }

    for (const p of paradas) {
      const dist = haversineKm(anterior.lat, anterior.lng, p.lat, p.lng)
      distanciaTotal += dist
      anterior = { lat: p.lat, lng: p.lng }
    }

    // Retorno a base
    distanciaTotal += haversineKm(anterior.lat, anterior.lng, parseFloat(origenLat), parseFloat(origenLng))

    const duracionHoras = distanciaTotal / 70 // promedio 70 km/h en rutas argentinas

    const ruta = await db.ruta.create({
      data: {
        nombre,
        estado: 'PLANIFICADA',
        origenNombre,
        origenLat: parseFloat(origenLat),
        origenLng: parseFloat(origenLng),
        distanciaKm: Math.round(distanciaTotal * 10) / 10,
        duracionHoras: Math.round(duracionHoras * 10) / 10,
        paradas: {
          create: paradas.map((p: { lat: number; lng: number; nombre: string; provincia: string; cylinderIds?: string; notas?: string }, idx: number) => ({
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

    return NextResponse.json(ruta, { status: 201 })
  } catch (e) {
    console.error('POST /api/routes', e)
    return NextResponse.json({ error: 'Error al crear ruta' }, { status: 500 })
  }
}
