import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/locations - listar ubicaciones
export async function GET() {
  try {
    const locations = await db.location.findMany({
      orderBy: [{ esBase: 'desc' }, { nombre: 'asc' }],
    })
    return NextResponse.json(locations)
  } catch (e) {
    console.error('GET /api/locations', e)
    return NextResponse.json({ error: 'Error al obtener ubicaciones' }, { status: 500 })
  }
}

// POST /api/locations - crear nueva ubicación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.nombre) {
      return NextResponse.json({ error: 'nombre es obligatorio' }, { status: 400 })
    }
    const loc = await db.location.create({
      data: {
        nombre: body.nombre,
        provincia: body.provincia || '',
        lat: body.lat ? parseFloat(body.lat) : 0,
        lng: body.lng ? parseFloat(body.lng) : 0,
        tipo: body.tipo || 'BASE',
        esBase: body.esBase || false,
        direccion: body.direccion || null,
        telefono: body.telefono || null,
      },
    })
    return NextResponse.json(loc, { status: 201 })
  } catch (e) {
    console.error('POST /api/locations', e)
    return NextResponse.json({ error: 'Error al crear ubicación' }, { status: 500 })
  }
}
