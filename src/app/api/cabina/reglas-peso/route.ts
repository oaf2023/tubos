import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const reglas = await db.reglaPeso.findMany({
      include: { gas: true },
      orderBy: { gas: { nombre: 'asc' } },
    })
    return NextResponse.json(reglas)
  } catch (e) {
    console.error('GET /api/cabina/reglas-peso', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.gasId) {
      return NextResponse.json({ error: 'gasId requerido' }, { status: 400 })
    }
    const regla = await db.reglaPeso.upsert({
      where: { gasId: body.gasId },
      update: {
        pesoMinKg: body.pesoMinKg ?? null,
        pesoMaxKg: body.pesoMaxKg ?? null,
        pesoTaraKg: body.pesoTaraKg ?? null,
        pesoLlenoKg: body.pesoLlenoKg ?? null,
      },
      create: {
        gasId: body.gasId,
        pesoMinKg: body.pesoMinKg ?? null,
        pesoMaxKg: body.pesoMaxKg ?? null,
        pesoTaraKg: body.pesoTaraKg ?? null,
        pesoLlenoKg: body.pesoLlenoKg ?? null,
      },
    })
    return NextResponse.json(regla)
  } catch (e) {
    console.error('POST /api/cabina/reglas-peso', e)
    return NextResponse.json({ error: 'Error al guardar regla de peso' }, { status: 500 })
  }
}
