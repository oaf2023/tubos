import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.tagRFID.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/deposito/tags/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
