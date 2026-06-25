import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const validaciones = await db.validacionCabina.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { cabina: true, cylinder: true, lecturaPeso: true, evidenciaFoto: true },
    })
    return NextResponse.json(validaciones)
  } catch (e) {
    console.error('GET /api/cabina/validacion', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
