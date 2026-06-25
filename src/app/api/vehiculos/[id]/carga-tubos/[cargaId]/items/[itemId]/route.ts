import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; cargaId: string; itemId: string }> }) {
  try {
    await db.cargaVehiculoItem.delete({ where: { id: (await params).itemId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE carga-tubos items/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
