import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/articulos/stats
export async function GET() {
  try {
    const total = await db.articulo.count()
    const conStock = await db.articulo.count({ where: { ART_STIN: { gt: 0 } } })

    const lowStock = await db.articulo.findMany({
      where: { ART_SMIN: { gt: 0 }, AND: [{ ART_STIN: { lt: db.articulo.fields.ART_SMIN } }, { ART_STIN: { not: null } }] },
      orderBy: { ART_STIN: 'asc' },
      take: 20,
      select: { ART_CODI: true, ART_DET1: true, ART_STIN: true, ART_SMIN: true, ART_UNID: true },
    })

    // Aggregations via raw query for speed
    const byMarca = await db.$queryRawUnsafe<{ codigo: number; cantidad: bigint }[]>(
      `SELECT "ART_MARC" as codigo, COUNT(*) as cnt FROM "Articulo" WHERE "ART_MARC" IS NOT NULL GROUP BY "ART_MARC" ORDER BY cnt DESC LIMIT 15`
    )
    const byRubro = await db.$queryRawUnsafe<{ codigo: number; cantidad: bigint }[]>(
      `SELECT "ART_RUBR" as codigo, COUNT(*) as cnt FROM "Articulo" WHERE "ART_RUBR" IS NOT NULL GROUP BY "ART_RUBR" ORDER BY cnt DESC LIMIT 15`
    )
    const bySubrubro = await db.$queryRawUnsafe<{ codigo: number; cantidad: bigint }[]>(
      `SELECT "ART_SUBR" as codigo, COUNT(*) as cnt FROM "Articulo" WHERE "ART_SUBR" IS NOT NULL GROUP BY "ART_SUBR" ORDER BY cnt DESC LIMIT 15`
    )
    const byDpto = await db.$queryRawUnsafe<{ codigo: number; cantidad: bigint }[]>(
      `SELECT "ART_DPTO" as codigo, COUNT(*) as cnt FROM "Articulo" WHERE "ART_DPTO" IS NOT NULL GROUP BY "ART_DPTO" ORDER BY cnt DESC LIMIT 15`
    )
    const byUnidad = await db.$queryRawUnsafe<{ unidad: string; cantidad: bigint }[]>(
      `SELECT "ART_UNID" as unidad, COUNT(*) as cnt FROM "Articulo" WHERE "ART_UNID" IS NOT NULL AND "ART_UNID" != '' GROUP BY "ART_UNID" ORDER BY cnt DESC`
    )

    const precioRanges = await db.$queryRawUnsafe<{ rango: string; cantidad: bigint }[]>(
      `SELECT CASE WHEN "ART_PRE1" IS NULL OR "ART_PRE1" = 0 THEN 'Sin precio' WHEN "ART_PRE1" < 100 THEN '0-100' WHEN "ART_PRE1" < 500 THEN '100-500' WHEN "ART_PRE1" < 2000 THEN '500-2K' WHEN "ART_PRE1" < 10000 THEN '2K-10K' ELSE '10K+' END as rango, COUNT(*) as cnt FROM "Articulo" GROUP BY rango ORDER BY rango`
    )

    const totalValor = await db.articulo.aggregate({
      _sum: { ART_PRE1: true },
      where: { ART_STIN: { gt: 0 } },
    })

    return NextResponse.json({
      total,
      conStock,
      sinStock: total - conStock,
      totalValor: totalValor._sum.ART_PRE1 || 0,
      lowStock: lowStock.map(r => ({ ...r, ART_STIN: Number(r.ART_STIN), ART_SMIN: Number(r.ART_SMIN) })),
      byMarca: byMarca.map(r => ({ codigo: Number(r.codigo), cantidad: Number(r.cantidad) })),
      byRubro: byRubro.map(r => ({ codigo: Number(r.codigo), cantidad: Number(r.cantidad) })),
      bySubrubro: bySubrubro.map(r => ({ codigo: Number(r.codigo), cantidad: Number(r.cantidad) })),
      byDpto: byDpto.map(r => ({ codigo: Number(r.codigo), cantidad: Number(r.cantidad) })),
      byUnidad: byUnidad.map(r => ({ unidad: r.unidad, cantidad: Number(r.cantidad) })),
      precioRanges: precioRanges.map(r => ({ rango: r.rango, cantidad: Number(r.cantidad) })),
    })
  } catch (e) {
    console.error('GET /api/articulos/stats', e)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
