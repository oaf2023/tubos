import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('ubicacion')

    const where = location && location !== 'all'
      ? { ubicacionNombre: location }
      : {}

    const stock = await db.cylinder.groupBy({
      by: ['ubicacionNombre', 'estado', 'gasId'],
      where,
      _count: { id: true },
    })

    const gases = await db.gas.findMany({
      select: { id: true, codigo: true, nombre: true, colorHex: true },
    })
    const gasMap = new Map(gases.map(g => [g.id, g]))

    const locations = await db.location.findMany({
      orderBy: { nombre: 'asc' },
      where: { tipo: 'BASE' },
    })

    const stockPorUbicacion = new Map<string, any>()
    for (const s of stock) {
      const key = s.ubicacionNombre
      if (!stockPorUbicacion.has(key)) {
        stockPorUbicacion.set(key, { ubicacion: key, estados: {}, total: 0 })
      }
      const entry = stockPorUbicacion.get(key)
      entry.estados[s.estado] = (entry.estados[s.estado] || 0) + s._count.id
      entry.total += s._count.id
    }

    const stockPorGas = new Map<string, any>()
    for (const s of stock) {
      const gas = gasMap.get(s.gasId)
      if (!gas) continue
      const key = s.gasId
      if (!stockPorGas.has(key)) {
        stockPorGas.set(key, { gas, estados: {}, total: 0 })
      }
      const entry = stockPorGas.get(key)
      entry.estados[s.estado] = (entry.estados[s.estado] || 0) + s._count.id
      entry.total += s._count.id
    }

    return NextResponse.json({
      stockPorUbicacion: Array.from(stockPorUbicacion.values()),
      stockPorGas: Array.from(stockPorGas.values()),
      locations: locations.map(l => l.nombre),
      total: stock.reduce((s, g) => s + g._count.id, 0),
    })
  } catch (e) {
    console.error('GET /api/deposito/resumen', e)
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 })
  }
}
