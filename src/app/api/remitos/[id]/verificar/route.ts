import { NextRequest, NextResponse } from 'next/server'
import { verificarTuboParaDescarga } from '@/lib/verificacion-descarga'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const valor = (body.valor || '').trim()
    if (!valor) {
      return NextResponse.json({ error: 'Código o serie requerida' }, { status: 400 })
    }
    const resultado = await verificarTuboParaDescarga({ id }, valor)
    return NextResponse.json(resultado)
  } catch (e) {
    console.error('POST /api/remitos/[id]/verificar', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al verificar tubo' }, { status: 500 })
  }
}