import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const configs = await db.alertConfig.findMany({
      include: { gas: true },
      orderBy: { gas: { nombre: 'asc' } },
    })
    return NextResponse.json(configs)
  } catch (e) {
    console.error('GET /api/config-alertas', e)
    return NextResponse.json(
      { error: 'Error al obtener configuración de alertas' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() // { gasId, diasAlertaRetest, diasMaxCliente, alertaPH, activo }

    if (!body.gasId) {
      return NextResponse.json(
        { error: 'gasId es requerido' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (body.diasAlertaRetest !== undefined)
      data.diasAlertaRetest = parseInt(body.diasAlertaRetest, 10)
    if (body.diasMaxCliente !== undefined)
      data.diasMaxCliente = parseInt(body.diasMaxCliente, 10)
    if (body.alertaPH !== undefined)
      data.alertaPH = Boolean(body.alertaPH)
    if (body.activo !== undefined)
      data.activo = Boolean(body.activo)

    const config = await db.alertConfig.upsert({
      where: { gasId: body.gasId },
      update: data,
      create: {
        gasId: body.gasId,
        diasAlertaRetest: parseInt(body.diasAlertaRetest ?? 60, 10),
        diasMaxCliente: parseInt(body.diasMaxCliente ?? 90, 10),
        alertaPH: body.alertaPH !== undefined ? Boolean(body.alertaPH) : true,
        activo: body.activo !== undefined ? Boolean(body.activo) : true,
      },
      include: { gas: true },
    })

    return NextResponse.json(config)
  } catch (e) {
    console.error('PUT /api/config-alertas', e)
    return NextResponse.json(
      { error: 'Error al actualizar configuración de alertas' },
      { status: 500 }
    )
  }
}
