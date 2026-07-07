import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()

    if (!q) {
      return NextResponse.json({ error: 'Parámetro q requerido' }, { status: 400 })
    }

    // 1. Buscar por número de serie exacto
    let cylinder = await db.cylinder.findUnique({
      where: { numeroSerie: q },
      include: { gas: true },
    })

    // 2. Si no se encuentra, buscar en IdentificadorTubo
    if (!cylinder) {
      const identificador = await db.identificadorTubo.findUnique({
        where: { valor: q },
        select: { cylinderId: true },
      })
      if (identificador) {
        cylinder = await db.cylinder.findUnique({
          where: { id: identificador.cylinderId },
          include: { gas: true },
        })
      }
    }

    if (!cylinder) {
      return NextResponse.json({ error: 'Tubo no encontrado' }, { status: 404 })
    }

    return NextResponse.json(cylinder)
  } catch (e) {
    console.error('GET /api/cylinders/search', e)
    return NextResponse.json({ error: 'Error al buscar tubo' }, { status: 500 })
  }
}
