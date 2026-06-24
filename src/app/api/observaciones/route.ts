import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const obs = await db.observacion.findMany({
      include: { archivos: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(obs)
  } catch (e) {
    console.error('GET /api/observaciones', e)
    return NextResponse.json({ error: 'Error al obtener observaciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, titulo, descripcion, audioUrl, createdBy, archivos } = body
    if (!tipo) {
      return NextResponse.json({ error: 'tipo requerido' }, { status: 400 })
    }
    const obs = await db.observacion.create({
      data: {
        tipo,
        titulo: titulo || null,
        descripcion: descripcion || null,
        audioUrl: audioUrl || null,
        createdBy: createdBy || null,
        archivos: archivos && archivos.length > 0
          ? { create: archivos.map((a: any) => ({ tipo: a.tipo, nombre: a.nombre, datos: a.datos })) }
          : undefined,
      },
      include: { archivos: true },
    })
    return NextResponse.json(obs, { status: 201 })
  } catch (e) {
    console.error('POST /api/observaciones', e)
    return NextResponse.json({ error: 'Error al crear observación' }, { status: 500 })
  }
}
