import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const stock = await db.stockGas.findMany({
      include: { gas: true },
      orderBy: { gas: { nombre: 'asc' } },
    })
    const totales = {
      llenos: stock.reduce((s, g) => s + g.llenos, 0),
      vacios: stock.reduce((s, g) => s + g.vacios, 0),
      enReparto: stock.reduce((s, g) => s + g.enReparto, 0),
      enCarga: stock.reduce((s, g) => s + g.enCarga, 0),
      mantenimiento: stock.reduce((s, g) => s + g.mantenimiento, 0),
      baja: stock.reduce((s, g) => s + g.baja, 0),
    }
    return NextResponse.json({ stock, totales })
  } catch (e) {
    console.error('GET /api/deposito/stock', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.gasId) {
      return NextResponse.json({ error: 'gasId requerido' }, { status: 400 })
    }
    const registro = await db.stockGas.upsert({
      where: { gasId: body.gasId },
      update: {
        llenos: body.llenos ?? undefined,
        vacios: body.vacios ?? undefined,
        enReparto: body.enReparto ?? undefined,
        enCarga: body.enCarga ?? undefined,
        mantenimiento: body.mantenimiento ?? undefined,
        baja: body.baja ?? undefined,
      },
      create: {
        gasId: body.gasId,
        llenos: body.llenos || 0,
        vacios: body.vacios || 0,
        enReparto: body.enReparto || 0,
        enCarga: body.enCarga || 0,
        mantenimiento: body.mantenimiento || 0,
        baja: body.baja || 0,
      },
    })
    return NextResponse.json(registro)
  } catch (e) {
    console.error('POST /api/deposito/stock', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
