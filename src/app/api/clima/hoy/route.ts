import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const registros = await db.clima.findMany({
      where: { fechaDate: hoy },
      orderBy: [{ momento: 'asc' }, { fuente: 'asc' }],
    })

    // Agrupar por momento
    const agrupado: Record<string, typeof registros> = {}
    for (const r of registros) {
      if (!agrupado[r.momento]) agrupado[r.momento] = []
      agrupado[r.momento].push(r)
    }

    return NextResponse.json({
      fecha: hoy.toISOString().slice(0, 10),
      momentos: agrupado,
      total: registros.length,
    })
  } catch (e) {
    console.error('GET /api/clima/hoy', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener clima de hoy' }, { status: 500 })
  }
}
