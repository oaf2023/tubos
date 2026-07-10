import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fecaeSolicitar } from '@/lib/arca/wsfev1'
import { buildArcaQrPayload, buildArcaQrUrl } from '@/lib/arca/qr'
import { getCodigoARCA } from '@/lib/arca/motor-comprobante'
import { logAudit } from '@/lib/audit'
import { serializeComprobante } from '@/lib/services/comprobante-service'
import { randomUUID } from 'crypto'
import crypto from 'crypto'

export async function POST(req: NextRequest, { params }: any) {
  try {
    const body = await req.json().catch(() => ({}))
    const idempotencyKey = body.idempotencyKey || crypto.randomUUID()

    const doc = await db.documentoComercial.findUnique({
      where: { id: params.id },
      include: { items: true, tributos: true },
    })
    if (!doc) {
      return NextResponse.json({ error: 'Comprobante no encontrado' }, { status: 404 })
    }
    if (doc.estado === 'AUTORIZADO') {
      return NextResponse.json({ error: 'El comprobante ya está autorizado', cae: doc.cae }, { status: 409 })
    }
    if (doc.estado === 'ANULADO') {
      return NextResponse.json({ error: 'No se puede autorizar un comprobante anulado' }, { status: 400 })
    }
    if (!doc.fiscal) {
      return NextResponse.json({ error: 'El comprobante no es fiscal, no requiere autorización' }, { status: 400 })
    }

    const existingAuth = await db.arcaComprobanteAutorizacion.findFirst({
      where: { idempotencyKey },
    })
    if (existingAuth) {
      return NextResponse.json({
        success: existingAuth.resultado === 'A',
        resultado: existingAuth.resultado,
        cae: existingAuth.cae,
        caeVencimiento: existingAuth.caeVencimiento?.toISOString().slice(0, 10) || null,
        mensaje: 'Idempotency key reutilizada: la autorización ya fue procesada',
        yaProcesado: true,
      })
    }

    const config = await db.configuracionFiscal.findUnique({ where: { id: 'default' } })
    if (!config) {
      return NextResponse.json({ error: 'Configuración fiscal no encontrada' }, { status: 500 })
    }

    if (config.permitirCaeManual && config.modoArca === 'MANUAL') {
      const log = await db.arcaRequestLog.create({
        data: {
          documentoId: doc.id,
          tipoOperacion: 'FECAESolicitar',
          requestJson: JSON.stringify({ modoManual: true }),
          responseJson: JSON.stringify({ resultado: 'A', state: 'MANUAL' }),
          resultado: 'A',
          observaciones: 'Modo manual: el usuario debe ingresar CAE manualmente',
          modo: 'MANUAL',
        },
      })
      return NextResponse.json({
        resultado: 'A',
        cae: null,
        state: 'MANUAL',
        mensaje: 'Modo manual: ingrese el CAE manualmente en la edición del comprobante',
      })
    }

    await db.documentoComercial.update({
      where: { id: params.id },
      data: { estado: 'EN_AUTORIZACION' },
    })

    const emisorCuit = parseInt((config.cuit || '').replace(/\D/g, '')) || 0
    const receptorCuit = parseInt((doc.clienteDocumentoNumero || '').replace(/\D/g, '')) || 0

    const alicuotas: Array<{ id: number; baseImponible: number; importe: number }> = []
    const ivas = [
      { key: 'iva27', id: 5 }, { key: 'iva21', id: 4 }, { key: 'iva105', id: 3 },
      { key: 'iva5', id: 8 }, { key: 'iva25', id: 9 },
    ]
    for (const iva of ivas) {
      const importe = Number((doc as any)[iva.key] || 0)
      if (importe > 0) {
        alicuotas.push({
          id: iva.id,
          baseImponible: Math.round(importe / (iva.id === 4 ? 0.21 : iva.id === 5 ? 0.27 : iva.id === 3 ? 0.105 : iva.id === 8 ? 0.05 : 0.025) * 100) / 100,
          importe,
        })
      }
    }

    const solicitud = {
      comprobante: {
        tipoDocumento: doc.tipoDocumento,
        letra: doc.letra,
        puntoVenta: parseInt(doc.puntoVenta) || 0,
        numero: doc.numero,
        fecha: doc.fecha.toISOString().slice(0, 10),
        cuitEmisor: emisorCuit,
        cuitReceptor: doc.letra === 'A' ? receptorCuit : null,
        tipoDocReceptor: doc.clienteDocumentoTipo ? (doc.clienteDocumentoTipo.includes('CUIT') ? 80 : 96) : 99,
        nroDocReceptor: receptorCuit,
        importeNeto: Number(doc.netoGravado || 0),
        importeIva: [doc.iva21, doc.iva105, doc.iva27, doc.iva5, doc.iva25].reduce((s, v) => s + Number(v || 0), 0),
        importeTotal: Number(doc.total || 0),
        moneda: doc.moneda === 'USD' ? 'DOL' : 'PES',
        tipoCambio: Number(doc.tipoCambio || 1),
        alicuotas,
        exento: Number(doc.netoExento || 0),
        concepto: 1,
        periodoDesde: doc.periodoDesde?.toISOString().slice(0, 10),
        periodoHasta: doc.periodoHasta?.toISOString().slice(0, 10),
      },
    }

    const startTime = Date.now()
    const respuesta = await fecaeSolicitar(solicitud)
    const duracionMs = Date.now() - startTime

    await db.arcaRequestLog.create({
      data: {
        documentoId: doc.id,
        tipoOperacion: 'FECAESolicitar',
        requestJson: JSON.stringify(solicitud),
        responseJson: JSON.stringify(respuesta),
        resultado: respuesta.resultado,
        cae: respuesta.cae || undefined,
        observaciones: respuesta.observaciones?.join('\n') || undefined,
        mensajeError: respuesta.errors?.join('\n') || undefined,
        duracionMs,
        modo: config.modoArca || 'MOCK',
      },
    })

    if (respuesta.resultado === 'A' && respuesta.cae) {
      const qrPayload = buildArcaQrPayload({
        fecha: doc.fecha,
        puntoVenta: doc.puntoVenta,
        tipoDocumento: doc.tipoDocumento,
        letra: doc.letra,
        numero: doc.numero,
        total: Number(doc.total),
        moneda: doc.moneda,
        tipoCambio: Number(doc.tipoCambio),
        clienteDocumentoTipo: doc.clienteDocumentoTipo,
        clienteDocumentoNumero: doc.clienteDocumentoNumero,
        cae: respuesta.cae,
      }, config)
      const qrUrl = buildArcaQrUrl(qrPayload)

      const updated = await db.documentoComercial.update({
        where: { id: params.id },
        data: {
          estado: 'AUTORIZADO',
          cae: respuesta.cae,
          caeVencimiento: respuesta.caeVencimiento ? new Date(respuesta.caeVencimiento) : null,
          codigoAutorizacion: respuesta.cae,
          qrPayload,
          idempotencyKey,
        },
        include: { items: true, tributos: true },
      })

      await db.arcaComprobanteAutorizacion.create({
        data: {
          documentoId: doc.id,
          tipoOperacion: 'FECAESolicitar',
          resultado: 'A',
          cae: respuesta.cae,
          caeVencimiento: respuesta.caeVencimiento ? new Date(respuesta.caeVencimiento) : null,
          codigoAutorizacion: respuesta.cae,
          responseXml: respuesta.responseXml || null,
          requestJson: JSON.stringify(solicitud),
          responseJson: JSON.stringify(respuesta),
          observaciones: respuesta.observaciones?.join('\n') || null,
          modo: config.modoArca || 'MOCK',
          idempotencyKey,
          duracionMs,
        },
      })

      await logAudit({
        accion: 'UPDATE',
        entidad: 'DocumentoComercial',
        entidadId: doc.id,
        detalle: {
          accion: 'AUTORIZACION_CAE',
          cae: respuesta.cae,
          resultado: 'AUTORIZADO',
          qrUrl,
          idempotencyKey,
        },
      })

      return NextResponse.json({
        success: true,
        resultado: 'A',
        cae: respuesta.cae,
        caeVencimiento: respuesta.caeVencimiento,
        qrUrl,
        doc: serializeComprobante(updated),
        idempotencyKey,
      })
    }

    await db.documentoComercial.update({
      where: { id: params.id },
      data: { estado: 'RECHAZADO' },
    })

    await db.arcaComprobanteAutorizacion.create({
      data: {
        documentoId: doc.id,
        tipoOperacion: 'FECAESolicitar',
        resultado: respuesta.resultado,
        requestJson: JSON.stringify(solicitud),
        responseJson: JSON.stringify(respuesta),
        observaciones: respuesta.observaciones?.join('\n') || null,
        errors: respuesta.errors?.join('\n') || null,
        modo: config.modoArca || 'MOCK',
        idempotencyKey,
        duracionMs,
      },
    })

    await logAudit({
      accion: 'UPDATE',
      entidad: 'DocumentoComercial',
      entidadId: doc.id,
      detalle: {
        accion: 'AUTORIZACION_CAE',
        resultado: 'RECHAZADO',
        observaciones: respuesta.observaciones,
        errors: respuesta.errors,
        idempotencyKey,
      },
    })

    return NextResponse.json({
      success: false,
      resultado: 'R',
      observaciones: respuesta.observaciones,
      errors: respuesta.errors,
      idempotencyKey,
    }, { status: 422 })
  } catch (e) {
    console.error('POST /api/comprobantes/[id]/autorizar', e)
    return NextResponse.json({ error: 'Error al autorizar comprobante' }, { status: 500 })
  }
}
