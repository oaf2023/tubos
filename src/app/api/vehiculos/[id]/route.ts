import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const updated = await db.vehiculo.update({ where: { id }, data: body })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Código o patente ya existe' }, { status: 409 })
    console.error('PUT /api/vehiculos/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.vehiculo.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/vehiculos/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
