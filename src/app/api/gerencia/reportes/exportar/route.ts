import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await requireRole('gerencia')
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const formato = searchParams.get('formato') || 'json'
  const tipo = searchParams.get('tipo') || 'diario'

  const data = {
    tipo,
    generado: new Date().toISOString(),
    usuario: session.nombre,
    resumen: {
      ventasBrutas: 2845690.50,
      ventasNetas: 2618035.26,
      cantidadOrdenes: 847,
      totalCobrado: 2712340.00,
      totalComisiones: 189230.50,
      dineroDisponible: 892340.00,
      dineroPendiente: 423500.00,
    },
    detalle: [] as unknown[],
  }

  if (formato === 'csv') {
    const headers = 'indicador,valor\n'
    const rows = Object.entries(data.resumen).map(([k, v]) => `${k},${v}`).join('\n')
    return new NextResponse(headers + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte-${tipo}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  if (formato === 'excel') {
    // Placeholder: en Fase 7 se implementará con xlsx library
    return NextResponse.json({ message: 'Exportación Excel disponible en Fase 7' })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const session = await requireRole('gerencia')
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { formato, tipo } = body

  if (formato === 'excel') {
    return NextResponse.json({ message: 'Exportación Excel disponible en Fase 7' })
  }

  return NextResponse.json({
    message: `Reporte ${tipo} generado en formato ${formato}`,
    descarga: `/api/gerencia/reportes/exportar?formato=${formato}&tipo=${tipo}`,
  })
}
