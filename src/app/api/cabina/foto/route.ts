import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.cabinaId || !body.imagen) {
      return NextResponse.json({ error: 'cabinaId e imagen requeridos' }, { status: 400 })
    }
    const foto = await db.evidenciaFoto.create({
      data: {
        cabinaId: body.cabinaId,
        cylinderId: body.cylinderId || null,
        imagen: body.imagen,
      },
    })
    return NextResponse.json(foto, { status: 201 })
  } catch (e) {
    console.error('POST /api/cabina/foto', e)
    return NextResponse.json({ error: 'Error al guardar foto' }, { status: 500 })
  }
}
