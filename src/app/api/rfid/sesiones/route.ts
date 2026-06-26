import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
    const soloActivas = searchParams.get('activas') === 'true'

    const where: any = {}
    if (soloActivas) where.procesado = false

    const sesiones = await db.sesionLecturaRFID.findMany({
      where,
      orderBy: { ultimaLectura: 'desc' },
      take: limit,
      include: {
        lector: { select: { codigo: true, nombre: true } },
        zona: { select: { codigo: true, nombre: true, tipo: true } },
        tag: { select: { tid: true } },
        cylinder: { select: { id: true, numeroSerie: true, estado: true } },
      },
    })

    return NextResponse.json(sesiones)
  } catch (e) {
    console.error('GET /api/rfid/sesiones', e)
    return NextResponse.json({ error: 'Error al obtener sesiones RFID' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sesionId } = await req.json()
    if (!sesionId) {
      return NextResponse.json({ error: 'sesionId requerido' }, { status: 400 })
    }

    const sesion = await db.sesionLecturaRFID.update({
      where: { id: sesionId },
      data: { procesado: true, fin: new Date() },
    })

    return NextResponse.json(sesion)
  } catch (e) {
    console.error('POST /api/rfid/sesiones (cerrar)', e)
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 })
  }
}
