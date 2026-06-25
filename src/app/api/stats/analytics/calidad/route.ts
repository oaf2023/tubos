import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const validaciones = await db.validacionCabina.findMany({
      include: { cylinder: { include: { gas: { select: { codigo: true, colorHex: true } } } }, cabina: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    const alertas = await db.alerta.findMany({
      include: { cabina: { select: { nombre: true } }, cylinder: { select: { numeroSerie: true } } },
      orderBy: { fecha: 'desc' },
      take: 100,
    })

    const diagnosticos: Record<string, number> = {}
    for (const v of validaciones) {
      diagnosticos[v.diagnostico] = (diagnosticos[v.diagnostico] || 0) + 1
    }

    const validacionesPorDia: Record<string, number> = {}
    for (const v of validaciones) {
      const key = v.createdAt.toISOString().slice(0, 10)
      validacionesPorDia[key] = (validacionesPorDia[key] || 0) + 1
    }

    const alertasPorTipo: Record<string, { tipo: string; count: number; criticas: number }> = {}
    for (const a of alertas) {
      if (!alertasPorTipo[a.tipo]) alertasPorTipo[a.tipo] = { tipo: a.tipo, count: 0, criticas: 0 }
      alertasPorTipo[a.tipo].count++
      if (a.nivel === 'CRITICAL') alertasPorTipo[a.tipo].criticas++
    }

    const alertasPorNivel: Record<string, number> = {}
    for (const a of alertas) {
      alertasPorNivel[a.nivel] = (alertasPorNivel[a.nivel] || 0) + 1
    }

    const scatterData = validaciones.filter(v => v.pesoRealKg && v.pesoEsperadoKg).map(v => ({
      x: v.pesoEsperadoKg,
      y: v.pesoRealKg,
      gas: v.cylinder?.gas?.codigo || '?',
      serie: v.cylinder?.numeroSerie || '?',
      diagnostico: v.diagnostico,
    }))

    const totalValidaciones = validaciones.length
    const conAlertas = validaciones.filter(v => v.alertaGenerada).length

    return NextResponse.json({
      resumen: {
        totalValidaciones,
        conAlertas,
        tasaInconsistencia: totalValidaciones > 0 ? Math.round(conAlertas / totalValidaciones * 100) : 0,
      },
      diagnosticos: Object.entries(diagnosticos).map(([diagnostico, cantidad]) => ({ diagnostico, cantidad })),
      validacionesPorDia: Object.entries(validacionesPorDia).map(([fecha, cantidad]) => ({ fecha, cantidad })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      alertasPorTipo: Object.values(alertasPorTipo).sort((a, b) => b.count - a.count),
      alertasPorNivel: Object.entries(alertasPorNivel).map(([nivel, cantidad]) => ({ nivel, cantidad })),
      scatterData,
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/calidad', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
