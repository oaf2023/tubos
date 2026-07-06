import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/articulos/export/csv
export async function GET() {
  try {
    const all = await db.articulo.findMany({ orderBy: { ART_CODI: 'asc' } })
    if (all.length === 0) {
      return new NextResponse('ART_CODI,ART_DET1\n', {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      })
    }

    const flat = all.map(a => {
      const datos = (a.datos || {}) as Record<string, any>
      const { datos: _d, createdAt, updatedAt, ...rest } = a
      return { ...rest, ...datos }
    })

    const cols = Object.keys(flat[0])
    const lines = [cols.join(',')]
    for (const row of flat) {
      lines.push(cols.map(c => {
        const v = (row as any)[c]
        if (v == null) return ''
        const s = String(v).replace(/"/g, '""')
        return /[,"\n]/.test(s) ? `"${s}"` : s
      }).join(','))
    }

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=articulos.csv',
      },
    })
  } catch (e) {
    console.error('GET /api/articulos/export/csv', e)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
