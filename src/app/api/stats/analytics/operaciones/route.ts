import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const cilindros = await db.cylinder.findMany({
      include: { gas: { select: { id: true, codigo: true, nombre: true, colorHex: true } } },
    })

    const estadoGas: Record<string, any> = {}
    for (const c of cilindros) {
      const g = c.gas.codigo
      if (!estadoGas[g]) estadoGas[g] = { gas: c.gas.codigo, nombre: c.gas.nombre, color: c.gas.colorHex, LLENO: 0, EN_USO: 0, VACIO: 0, MANTENIMIENTO: 0, TRANSITO: 0, total: 0 }
      const est = c.estado as string
      if (estadoGas[g][est] !== undefined) estadoGas[g][est]++
      estadoGas[g].total++
    }

    const mantenimientos = await db.mantenimiento.findMany({
      select: { tipo: true, costo: true, fecha: true },
    })

    const costosPorTipo: Record<string, { tipo: string; count: number; costo: number }> = {}
    let totalCostoMant = 0
    for (const m of mantenimientos) {
      if (!costosPorTipo[m.tipo]) costosPorTipo[m.tipo] = { tipo: m.tipo, count: 0, costo: 0 }
      costosPorTipo[m.tipo].count++
      costosPorTipo[m.tipo].costo += Number(m.costo || 0)
      totalCostoMant += Number(m.costo || 0)
    }

    const hoy = new Date()
    const retests = await db.cylinder.findMany({
      where: { fechaProximoRetest: { gte: hoy } },
      select: { fechaProximoRetest: true, estado: true },
      orderBy: { fechaProximoRetest: 'asc' },
    })

    const retestPorMes: Record<string, number> = {}
    for (const r of retests) {
      const key = `${r.fechaProximoRetest.getFullYear()}-${String(r.fechaProximoRetest.getMonth() + 1).padStart(2, '0')}`
      retestPorMes[key] = (retestPorMes[key] || 0) + 1
    }

    const vencidos = await db.cylinder.count({ where: { fechaProximoRetest: { lt: hoy } } })
    const totalMantenimientos = mantenimientos.length

    return NextResponse.json({
      estadoPorGas: Object.values(estadoGas),
      costosMantenimiento: Object.values(costosPorTipo).sort((a, b) => b.costo - a.costo),
      retestCalendar: Object.entries(retestPorMes).map(([mes, cantidad]) => ({ mes, cantidad })).slice(0, 12),
      resumen: {
        totalCilindros: cilindros.length,
        vencidosRetest: vencidos,
        totalMantenimientos,
        totalCostoMantenimiento: totalCostoMant,
      },
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/operaciones', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
