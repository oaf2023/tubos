import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { osrmTrip } from '@/lib/routing'
import { validarCapacidadCarga } from '@/lib/ruta-utils'
import { haversineKm } from '@/lib/haversine'

// GET /api/routes - con soporte para filtro por token de navegación
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    const where: Record<string, unknown> = {}
    if (token) where.navigationToken = token

    const routes = await db.ruta.findMany({
      where,
      include: {
        paradas: {
          orderBy: { orden: 'asc' },
          include: { cliente: { select: { id: true, nombre: true, contacto: true, taxId: true } } },
        },
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(routes)
  } catch (e) {
    console.error('GET /api/routes', e)
    return NextResponse.json({ error: 'Error al obtener rutas' }, { status: 500 })
  }
}

function calcularDemandaTotal(paradas: any[]): {
  totalCilindros: number
  cylinderIds: string[]
} {
  const ids: string[] = []
  for (const p of paradas) {
    const demanda = p.demandaTubos || 0
    // Simular IDs de cilindros según demanda
    for (let i = 0; i < demanda; i++) {
      ids.push(`demanda-${p.nombre}-${i}`)
    }
    if (p.cylinderIds) {
      ids.push(...p.cylinderIds.split(',').filter(Boolean))
    }
  }
  return { totalCilindros: ids.length, cylinderIds: ids }
}

// POST /api/routes - create route with OSRM real distances + capacity validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nombre, origenNombre, origenLat, origenLng,
      paradas, distanciaReal, duracionReal,
      geometry, vehicleId, costoPorKm, cylinderIds,
    } = body

    if (!nombre || !paradas || !Array.isArray(paradas) || paradas.length === 0) {
      return NextResponse.json({ error: 'Faltan campos: nombre, paradas' }, { status: 400 })
    }

    const oLat = parseFloat(origenLat)
    const oLng = parseFloat(origenLng)

    // Validate vehicle capacity if assigned
    if (vehicleId) {
      const demanda = calcularDemandaTotal(paradas)
      const capacidad = await validarCapacidadCarga(vehicleId, demanda.cylinderIds)
      if (!capacidad.valida) {
        return NextResponse.json({
          error: 'Capacidad de carga excedida',
          detalles: capacidad.observaciones,
          capacidad,
        }, { status: 400 })
      }
    }

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

    const geometryStr = geometry
      ? (typeof geometry === 'string' ? geometry : JSON.stringify(geometry))
      : undefined

    const costoTotal = costoPorKm ? costoPorKm * finalKm : null

    const ruta = await db.ruta.create({
      data: {
        nombre,
        estado: 'PLANIFICADA',
        origenNombre,
        origenLat: oLat,
        origenLng: oLng,
        distanciaKm: finalKm,
        duracionHoras: finalHoras,
        geometry: geometryStr,
        vehicleId: vehicleId || null,
        costoPorKm: costoPorKm || null,
        costoTotal,
        cylinderIds: cylinderIds || null,
        paradas: {
          create: paradas.map((p: any, idx: number) => ({
            orden: idx + 1,
            lat: p.lat,
            lng: p.lng,
            nombre: p.nombre,
            provincia: p.provincia || '',
            cylinderIds: p.cylinderIds || '',
            estado: 'PENDIENTE',
            notas: p.notas || null,
            clienteId: p.clienteId || null,
            demandaTubos: p.demandaTubos || null,
            pesoKg: p.pesoKg || null,
            ventanaDesde: p.ventanaDesde || null,
            ventanaHasta: p.ventanaHasta || null,
            tiempoServicioMin: p.tiempoServicioMin || null,
            prioridad: p.prioridad ?? 5,
            tipoOperacion: p.tipoOperacion || 'ENTREGA',
          })),
        },
      },
      include: {
        paradas: { orderBy: { orden: 'asc' } },
        vehicle: true,
      },
    })

    return NextResponse.json({ ...ruta, _fuente: fuente }, { status: 201 })
  } catch (e) {
    console.error('POST /api/routes', e)
    return NextResponse.json({ error: 'Error al crear ruta' }, { status: 500 })
  }
}
