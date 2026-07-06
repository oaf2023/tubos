import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type RouteContext = { params: Promise<{ id: string }> }

const MAIN = new Set(['ART_DET1', 'ART_COD1', 'ART_COD2', 'ART_COD3',
  'ART_PRE1', 'ART_PRE2', 'ART_PRE3', 'ART_PRE4', 'ART_COST', 'ART_TIVA',
  'ART_STIN', 'ART_SMIN', 'ART_SMAX', 'ART_UNID', 'ART_MARC', 'ART_RUBR',
  'ART_SUBR', 'ART_DPTO', 'ART_DTO1', 'ART_DTO2', 'ART_DTO3', 'ART_DTOG',
  'ART_LIST', 'ART_OFER', 'ART_POFE', 'ART_FLET', 'ART_OBS', 'ART_DET2',
  'ART_DET3', 'ART_DET4'])
const FLOAT_FIELDS = new Set(['ART_PRE1', 'ART_PRE2', 'ART_PRE3', 'ART_PRE4', 'ART_COST',
  'ART_STIN', 'ART_SMIN', 'ART_SMAX', 'ART_DTO1', 'ART_DTO2', 'ART_DTO3', 'ART_DTOG',
  'ART_POFE', 'ART_FLET'])
const INT_FIELDS = new Set(['ART_TIVA', 'ART_MARC', 'ART_RUBR', 'ART_SUBR', 'ART_DPTO',
  'ART_LIST', 'ART_OFER'])

function flatten(a: any) {
  const datos = (a.datos || {}) as Record<string, any>
  const { datos: _d, createdAt, updatedAt, ...rest } = a
  return { ...rest, ...datos }
}

function split(body: Record<string, any>, existingDatos?: Record<string, any>) {
  const mainFields: Record<string, any> = {}
  const extraFields: Record<string, any> = { ...(existingDatos || {}) }
  for (const [k, v] of Object.entries(body)) {
    const uk = k.toUpperCase()
    if (MAIN.has(uk)) {
      if (FLOAT_FIELDS.has(uk)) mainFields[uk] = v != null ? parseFloat(String(v)) : null
      else if (INT_FIELDS.has(uk)) mainFields[uk] = v != null ? parseInt(String(v)) : null
      else mainFields[uk] = v != null ? String(v) : null
    } else {
      extraFields[uk] = v
    }
  }
  return { mainFields, extraFields }
}

// GET /api/articulos/[id]
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const articulo = await db.articulo.findUnique({ where: { ART_CODI: parseInt(id) } })
    if (!articulo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(flatten(articulo))
  } catch (e) {
    console.error('GET /api/articulos/[id]', e)
    return NextResponse.json({ error: 'Error al obtener artículo' }, { status: 500 })
  }
}

// PUT /api/articulos/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const codi = parseInt(id)
    const existing = await db.articulo.findUnique({ where: { ART_CODI: codi } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const body = await request.json()
    const { mainFields, extraFields } = split(body, existing.datos as any)
    const articulo = await db.articulo.update({
      where: { ART_CODI: codi },
      data: { ...mainFields as any, datos: extraFields },
    })
    return NextResponse.json(flatten(articulo))
  } catch (e) {
    console.error('PUT /api/articulos/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar artículo' }, { status: 500 })
  }
}

// DELETE /api/articulos/[id]
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const codi = parseInt(id)
    const existing = await db.articulo.findUnique({ where: { ART_CODI: codi } })
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    await db.articulo.delete({ where: { ART_CODI: codi } })
    return NextResponse.json({ message: 'Artículo eliminado' })
  } catch (e) {
    console.error('DELETE /api/articulos/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar artículo' }, { status: 500 })
  }
}
