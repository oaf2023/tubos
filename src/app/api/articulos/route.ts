import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ALLOWED_FILTERS = [
  'ART_CODI', 'ART_DET1', 'ART_COD1', 'ART_COD2', 'ART_COD3',
  'ART_MARC', 'ART_RUBR', 'ART_SUBR', 'ART_DPTO', 'ART_TIVA',
  'ART_UNID', 'ART_OFER',
]

function buildWhere(search?: string, params?: URLSearchParams) {
  const AND: any[] = []
  if (search) {
    const num = parseInt(search)
    if (!isNaN(num)) {
      AND.push({ OR: [{ ART_CODI: num }, { ART_COD1: { contains: search } }, { ART_COD2: { contains: search } }] })
    } else {
      AND.push({ OR: [{ ART_DET1: { contains: search } }, { ART_COD1: { contains: search } }, { ART_COD2: { contains: search } }, { ART_COD3: { contains: search } }] })
    }
  }
  if (params) {
    for (const key of ALLOWED_FILTERS) {
      const val = params.get(key.toLowerCase())
      if (val) {
        const num = parseInt(val)
        AND.push({ [key]: isNaN(num) ? val : num })
      }
    }
  }
  return AND.length ? { AND } : {}
}

function flattenArticulo(a: any) {
  const datos = (a.datos || {}) as Record<string, any>
  const { datos: _d, createdAt, updatedAt, ...rest } = a
  return { ...rest, ...datos }
}

const MAIN = new Set(['ART_CODI', 'ART_DET1', 'ART_COD1', 'ART_COD2', 'ART_COD3',
  'ART_PRE1', 'ART_PRE2', 'ART_PRE3', 'ART_PRE4', 'ART_COST', 'ART_TIVA',
  'ART_STIN', 'ART_SMIN', 'ART_SMAX', 'ART_UNID', 'ART_MARC', 'ART_RUBR',
  'ART_SUBR', 'ART_DPTO', 'ART_DTO1', 'ART_DTO2', 'ART_DTO3', 'ART_DTOG',
  'ART_LIST', 'ART_OFER', 'ART_POFE', 'ART_FLET', 'ART_OBS', 'ART_DET2',
  'ART_DET3', 'ART_DET4'])

const FLOAT_FIELDS = new Set(['ART_PRE1', 'ART_PRE2', 'ART_PRE3', 'ART_PRE4', 'ART_COST',
  'ART_STIN', 'ART_SMIN', 'ART_SMAX', 'ART_DTO1', 'ART_DTO2', 'ART_DTO3', 'ART_DTOG',
  'ART_POFE', 'ART_FLET'])
const INT_FIELDS = new Set(['ART_TIVA', 'ART_MARC', 'ART_RUBR', 'ART_SUBR', 'ART_DPTO',
  'ART_LIST', 'ART_OFER', 'ART_CODI'])

function splitBody(body: Record<string, any>) {
  const mainFields: Record<string, any> = {}
  const extraFields: Record<string, any> = {}
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

// GET /api/articulos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const perPage = Math.min(200, Math.max(1, parseInt(searchParams.get('per_page') || '30')))
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sort_by') || 'ART_CODI'
    const sortDir = searchParams.get('sort_dir') === 'desc' ? 'desc' : 'asc'
    const skip = (page - 1) * perPage

    const where = buildWhere(search, searchParams)
    const orderBy = { [sortBy]: sortDir }

    const [data, total] = await Promise.all([
      db.articulo.findMany({ where, orderBy, skip, take: perPage }),
      db.articulo.count({ where }),
    ])

    return NextResponse.json({ data: data.map(flattenArticulo), total, page, per_page: perPage })
  } catch (e) {
    console.error('GET /api/articulos', e)
    return NextResponse.json({ error: 'Error al obtener artículos' }, { status: 500 })
  }
}

// POST /api/articulos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.ART_CODI || !body.ART_DET1) {
      return NextResponse.json({ error: 'ART_CODI y ART_DET1 son obligatorios' }, { status: 400 })
    }

    const existing = await db.articulo.findUnique({ where: { ART_CODI: parseInt(body.ART_CODI) } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un artículo con ese código' }, { status: 409 })
    }

    const { mainFields, extraFields } = splitBody(body)
    const articulo = await db.articulo.create({
      data: { ...mainFields as any, datos: extraFields },
    })
    return NextResponse.json(flattenArticulo(articulo), { status: 201 })
  } catch (e) {
    console.error('POST /api/articulos', e)
    return NextResponse.json({ error: 'Error al crear artículo' }, { status: 500 })
  }
}
