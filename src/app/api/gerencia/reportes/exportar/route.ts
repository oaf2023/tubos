import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const roleCheck = await requireRole('gerencia')(request)
  if (roleCheck) return roleCheck

  const { searchParams } = new URL(request.url)
  const formato = searchParams.get('formato') || 'json'
  const tipo = searchParams.get('tipo') || 'diario'

  const data = {
    tipo,
    generado: new Date().toISOString(),
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
    return NextResponse.json({ message: 'Exportación Excel disponible en Fase 7' })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const roleCheck = await requireRole('gerencia')(request)
  if (roleCheck) return roleCheck

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
