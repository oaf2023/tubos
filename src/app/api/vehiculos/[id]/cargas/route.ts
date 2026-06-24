import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const items = await db.cargaCombustible.findMany({
      where: { vehiculoId: id },
      orderBy: { fecha: 'desc' },
    })
    return NextResponse.json(items)
  } catch (e) {
    console.error('GET cargas', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const item = await db.cargaCombustible.create({
      data: { ...body, vehiculoId: id },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('POST carga', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
