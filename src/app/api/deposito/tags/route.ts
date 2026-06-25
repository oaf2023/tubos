import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const tags = await db.tagRFID.findMany({
      orderBy: { createdAt: 'desc' },
      include: { cylinder: true },
    })
    return NextResponse.json(tags)
  } catch (e) {
    console.error('GET /api/deposito/tags', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (body.action === 'asociar') {
      if (!body.tid || !body.cylinderId) {
        return NextResponse.json({ error: 'tid y cylinderId requeridos' }, { status: 400 })
      }
      const tag = await db.tagRFID.upsert({
        where: { tid: body.tid },
        update: { cylinderId: body.cylinderId, fechaAsociacion: new Date(), activo: true },
        create: { tid: body.tid, cylinderId: body.cylinderId, fechaAsociacion: new Date() },
      })
      return NextResponse.json(tag)
    }
    if (!body.tid) {
      return NextResponse.json({ error: 'tid requerido' }, { status: 400 })
    }
    const tag = await db.tagRFID.create({
      data: {
        tid: body.tid,
        cylinderId: body.cylinderId || null,
        activo: body.activo !== false,
      },
    })
    return NextResponse.json(tag, { status: 201 })
  } catch (e) {
    console.error('POST /api/deposito/tags', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
