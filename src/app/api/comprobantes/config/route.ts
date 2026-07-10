import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireGerenciaNivel0 } from '@/lib/api-auth'
import { ensureDefaultComprobanteConfig, serializeComprobante } from '@/lib/services/comprobante-service'

export async function GET() {
  try {
    await ensureDefaultComprobanteConfig()
    const cfg = await db.configuracionFiscal.findUnique({ where: { id: 'default' } })
    return NextResponse.json(serializeComprobante(cfg))
  } catch (e) {
    console.error('GET /api/comprobantes/config', e)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const forbidden = requireGerenciaNivel0(req)
  if (forbidden) return forbidden
  try {
    const b = await req.json()
    const cfg = await db.configuracionFiscal.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...b },
      update: {
        razonSocial: b.razonSocial,
        nombreComercial: b.nombreComercial,
        cuit: b.cuit,
        domicilioComercial: b.domicilioComercial,
        telefono: b.telefono,
        email: b.email,
        web: b.web,
        condicionIva: b.condicionIva,
        ingresosBrutos: b.ingresosBrutos,
        fechaInicioActividades: b.fechaInicioActividades,
        monedaDefault: b.monedaDefault,
        tipoCambioSugerido: Number(b.tipoCambioSugerido || 1),
        permitirUsd: Boolean(b.permitirUsd),
        ivaDefaultArticulos: Number(b.ivaDefaultArticulos || 21),
        ivaDefaultGases: Number(b.ivaDefaultGases || 21),
        ivaDefaultServicios: Number(b.ivaDefaultServicios || 21),
        permitirCaeManual: Boolean(b.permitirCaeManual),
        requerirCaeParaFiscal: Boolean(b.requerirCaeParaFiscal),
        mostrarArcaSiCaeVacio: false,
        modoArca: b.modoArca || 'MANUAL',
        retencionDocumentalAnios: Number(b.retencionDocumentalAnios || 10),
      },
    })
    return NextResponse.json(serializeComprobante(cfg))
  } catch (e) {
    console.error('PUT /api/comprobantes/config', e)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }
}
