import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ tubeId: string }> }) {
  try {
    const { tubeId } = await params

    const cylinder = await db.cylinder.findUnique({
      where: { id: tubeId },
      include: { gas: true },
    })

    if (!cylinder) {
      return NextResponse.json({ error: 'Tubo no encontrado' }, { status: 404 })
    }

    const hoy = new Date()
    const venc = new Date(cylinder.fechaProximoRetest)
    const alertas: string[] = []

    if (venc < hoy) {
      alertas.push('PH VENCIDA')
    } else {
      const diff = (venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      if (diff <= 60) alertas.push('PH PRÓXIMA A VENCER')
    }
    if (cylinder.estado === 'PH_VENCIDO') alertas.push('RECALIFICACIÓN REQUERIDA')
    if (cylinder.estado === 'MANTENIMIENTO') alertas.push('EN MANTENIMIENTO')

    const ultimoEvento = await db.eventoTubo.findFirst({
      where: { cylinderId: tubeId },
      orderBy: { fechaHora: 'desc' },
    })

    return NextResponse.json({
      tubeId: cylinder.id,
      codigoTubo: cylinder.numeroSerie,
      tipoGas: cylinder.gas.nombre,
      gasCodigo: cylinder.gas.codigo,
      gasColor: cylinder.gas.colorHex,
      capacidad: cylinder.capacidadLitros,
      estado: cylinder.estado,
      presionActual: cylinder.presionActualBar,
      clienteAsignado: cylinder.cliente,
      ubicacion: cylinder.ubicacionNombre,
      provincia: cylinder.provincia,
      fechaVencimientoPrueba: cylinder.fechaProximoRetest,
      ultimoMovimiento: ultimoEvento?.fechaHora || null,
      alertas,
    })
  } catch (e) {
    console.error('GET /api/mobile/tubes/[tubeId]/quick-view', e)
    return NextResponse.json({ error: 'Error al obtener vista rápida' }, { status: 500 })
  }
}
