import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { osrmTrip } from '@/lib/routing'
import { validarCapacidadCarga } from '@/lib/ruta-utils'
import { haversineKm } from '@/lib/haversine'
import type { LatLng, RouteResult, RoutingSource } from '@/lib/routing-types'

// GET /api/routes — list all routes, optionally filter by navigation token
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

function calcularDemandaTotal(paradas: any[]) {
  const ids: string[] = []
  for (const p of paradas) {
    const demanda = p.demandaTubos || 0
    for (let i = 0; i < demanda; i++) {
      ids.push(`demanda-${p.nombre}-${i}`)
    }
    if (p.cylinderIds) {
      ids.push(...p.cylinderIds.split(',').filter(Boolean))
    }
  }
  return { totalCilindros: ids.length, cylinderIds: ids }
}

// POST /api/routes — create route with OSRM real geometry + metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      nombre, origenNombre, origenLat, origenLng,
      paradas, geometry, vehicleId, costoPorKm, cylinderIds,
      isRealRoute: frontIsReal, routingSource: frontRoutingSource,
      optimizationEngine: frontOptimizationEngine,
      distanceTotal, durationMin,
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

    // --- Routing: try OSRM, fallback to Haversine ---
    let routeResult: RouteResult | null = null
    let routingSource: RoutingSource = 'NONE'
    let isRealRoute = false
    let finalKm = 0
    let finalHoras = 0
    let finalGeometry = ''

    // If metadata was pre-computed (from optimize), use it
    if (frontIsReal !== undefined || frontRoutingSource || geometry) {
      finalGeometry = geometry ? (typeof geometry === 'string' ? geometry : JSON.stringify(geometry)) : ''
      finalKm = distanceTotal || 0
      finalHoras = durationMin ? Math.round((durationMin / 60) * 10) / 10 : 0
      routingSource = frontRoutingSource || 'OSRM_PUBLIC'
      isRealRoute = frontIsReal !== false
    } else {
      // Try OSRM live
      const tripPoints: LatLng[] = [
        { lat: oLat, lng: oLng },
        ...paradas.map((p: any) => ({ lat: p.lat, lng: p.lng })),
        { lat: oLat, lng: oLng },
      ]
      routeResult = await osrmTrip(tripPoints)
      if (routeResult.isRealRoute) {
        finalKm = routeResult.distanceKm
        finalHoras = Math.round((routeResult.durationMin / 60) * 10) / 10
        finalGeometry = JSON.stringify(routeResult.geometry)
        routingSource = routeResult.source
        isRealRoute = true
      }
    }

    // Fallback: Haversine estimate
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
      routingSource = 'HAVERSINE_ESTIMATED'
      isRealRoute = false
    }

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
        geometry: finalGeometry || undefined,
        isRealRoute,
        routingSource,
        optimizationEngine: frontOptimizationEngine || 'NONE',
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

    // Audit
    try {
      const { logRouteCalc } = await import('@/lib/route-audit')
      const userHeader = request.headers.get('x-user')
      const user = userHeader ? JSON.parse(userHeader) : null
      await logRouteCalc({
        rutaId: ruta.id,
        userName: user?.nombre || user?.email || 'unknown',
        paradaCount: paradas.length,
        engine: frontOptimizationEngine || 'NONE',
        source: routingSource,
        distanceKm: finalKm,
        durationMin: Math.round(finalHoras * 60),
        isRealRoute,
        error: !isRealRoute ? 'Sin geometría real OSRM' : undefined,
      })
    } catch { /* audit non-fatal */ }

    return NextResponse.json({
      ...ruta,
      _routing: {
        source: routingSource,
        isRealRoute,
        geometryAvailable: !!finalGeometry,
        optimizationEngine: frontOptimizationEngine || 'NONE',
        calculatedAt: new Date().toISOString(),
      },
    }, { status: 201 })
  } catch (e) {
    console.error('POST /api/routes', e)
    return NextResponse.json({ error: 'Error al crear ruta' }, { status: 500 })
  }
}
