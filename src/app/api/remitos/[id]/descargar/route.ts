import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarMovimientoTubo } from '@/lib/trazabilidad'
import { recalcularEstadoRemito } from '@/lib/verificacion-descarga'
import { resolverUsuarioOperacion } from '@/lib/api-auth'

const CATALOGO_NOVEDAD = ['TUBO_OTRO_REMITO', 'TUBO_OTRO_CLIENTE', 'GAS_INCORRECTO', 'TUBO_DANIADO', 'PH_VENCIDA', 'FALTANTE', 'SOBRANTE', 'OTRO']
const CATALOGO_RESOLUCION = ['DESCARGAR_CON_NOVEDAD', 'NO_DESCARGAR', 'REASIGNAR', 'DEVOLVER_A_DEPOSITO']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { remitoItemId, novedad, novedadDetalle, metodoResolucion } = body
    if (!remitoItemId) {
      return NextResponse.json({ error: 'remitoItemId requerido' }, { status: 400 })
    }
    if (novedad && !CATALOGO_NOVEDAD.includes(novedad)) {
      return NextResponse.json({ error: 'Tipo de novedad inválido' }, { status: 400 })
    }
    if (novedad && metodoResolucion && !CATALOGO_RESOLUCION.includes(metodoResolucion)) {
      return NextResponse.json({ error: 'Método de resolución inválido' }, { status: 400 })
    }
    if (novedad && !metodoResolucion) {
      return NextResponse.json({ error: 'Método de resolución requerido' }, { status: 400 })
    }

    const user = await resolverUsuarioOperacion(req, body)
    const usuarioNombre = user?.nombre || user?.usuario || null

    const result = await db.$transaction(async (tx) => {
      const remito = await tx.remito.findUnique({ where: { id }, include: { items: true } })
      if (!remito) throw new Error('Remito no encontrado')
      if (remito.estado === 'FIRMADO') throw new Error('El remito ya está firmado')

      const item = remito.items.find((i) => i.id === remitoItemId)
      if (!item) throw new Error('Ítem del remito no encontrado')
      if (item.descargado) throw new Error('Este ítem ya fue descargado')

      const updated = await tx.remitoItem.update({
        where: { id: item.id },
        data: {
          descargado: true,
          fechaDescarga: new Date(),
          descargadoPor: usuarioNombre,
          novedad: novedad || null,
          novedadDetalle: novedadDetalle?.trim() || null,
          metodoResolucion: metodoResolucion || null,
        },
      })

      if (item.cylinderId) {
        const cylinder = await tx.cylinder.findUnique({ where: { id: item.cylinderId } })
        await registrarMovimientoTubo(
          {
            cylinderId: item.cylinderId,
            accion: 'ENTREGA',
            tipoMovimiento: 'ENTREGA',
            descripcion: `Descarga en destino remito N°${remito.numero}${remito.cliente ? ` - ${remito.cliente}` : ''}${novedad ? ` (novedad: ${novedad})` : ''}`,
            estadoAnterior: cylinder?.estado || null,
            estadoNuevo: 'EN_CLIENTE',
            clienteId: remito.clienteId,
            clienteNombre: remito.cliente,
            usuarioId: user?.id || null,
            usuarioNombre,
            remitoId: remito.id,
            origen: 'CELULAR_QR',
          },
          tx,
        )
      }

      const estado = await recalcularEstadoRemito(tx, remito.id)
      return { item: updated, estado }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('POST /api/remitos/[id]/descargar', e)
    const msg = e instanceof Error ? e.message : 'Error al descargar'
    const status = msg.includes('no encontrado') || msg.includes('ya') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}