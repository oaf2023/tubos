import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const ultimo = await db.cuentaCorrienteMovimiento.findFirst({
      where: { clienteId: id },
      orderBy: { fecha: 'desc' },
      select: { saldo: true },
    })

    return NextResponse.json({ saldo: ultimo?.saldo ?? 0 })
  } catch (e) {
    console.error('GET /api/clientes/[id]/saldo', e)
    return NextResponse.json({ error: 'Error al obtener saldo' }, { status: 500 })
  }
}
