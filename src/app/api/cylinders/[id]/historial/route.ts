import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const cylinder = await db.cylinder.findUnique({
      where: { id },
      select: { id: true, numeroSerie: true, gas: { select: { nombre: true, codigo: true } } },
    })
    if (!cylinder) return NextResponse.json({ error: 'Tubo no encontrado' }, { status: 404 })

    const [movimientos, eventos, mantenimientos, itemsRemito, docsItems, pedidos, lecturas, cargas] =
      await Promise.all([
        db.cylinderMovimiento.findMany({ where: { cylinderId: id } }),
        db.eventoTubo.findMany({ where: { cylinderId: id } }),
        db.mantenimiento.findMany({ where: { cylinderId: id } }),
        db.remitoItem.findMany({
          where: { cylinderId: id },
          include: {
            remito: { select: { id: true, numero: true, tipo: true, cliente: true, clienteId: true, createdAt: true } },
          },
        }),
        db.documentoComercialItem.findMany({
          where: { cylinderId: id },
          include: {
            documento: {
              select: {
                id: true,
                tipoDocumento: true,
                numeroFormateado: true,
                fecha: true,
                clienteNombre: true,
                usuarioNombre: true,
              },
            },
          },
        }),
        db.pedidoCilindro.findMany({
          where: { numeroSerie: cylinder.numeroSerie },
          include: {
            pedido: { select: { id: true, fecha: true, cliente: true, estado: true } },
          },
        }),
        db.lecturaPeso.findMany({ where: { cylinderId: id } }),
        db.cargaVehiculoItem.findMany({
          where: { cylinderId: id },
          include: { carga: { include: { vehiculo: { select: { patente: true } } } } },
        }),
      ])

    const filas: any[] = []

    for (const m of movimientos) {
      filas.push({
        id: `mov-${m.id}`,
        fecha: m.fecha,
        fuente: 'MOVIMIENTO',
        titulo: `Movimiento · ${m.tipo}`,
        detalle: m.descripcion,
        ubicacion: m.ubicacion,
        usuario: m.usuario,
        estadoAnterior: m.latOrigen ? `${m.latOrigen}` : null,
        enlace: null,
      })
    }

    for (const e of eventos) {
      filas.push({
        id: `evt-${e.id}`,
        fecha: e.fechaHora,
        fuente: 'EVENTO',
        titulo: `Evento · ${e.accion}`,
        detalle: e.observacion || undefined,
        cliente: e.clienteNombre || undefined,
        ubicacion: e.latitud ? `${e.latitud.toFixed(5)}, ${e.longitud?.toFixed(5)}` : undefined,
        usuario: e.usuarioNombre || undefined,
        estadoAnterior: e.estadoAnterior,
        estadoNuevo: e.estadoNuevo,
        fotoUrl: e.fotoUrl || undefined,
        autorizadoPor: e.autorizadoPor || undefined,
        enlace: null,
      })
    }

    for (const mt of mantenimientos) {
      filas.push({
        id: `mt-${mt.id}`,
        fecha: mt.fecha,
        fuente: 'MANTENIMIENTO',
        titulo: `Mantenimiento · ${mt.tipo}`,
        detalle: mt.descripcion || undefined,
        usuario: mt.tecnico || undefined,
        enlace: { tab: 'laboratorio' },
      })
    }

    for (const it of itemsRemito) {
      const devolucion = Boolean(it.fechaDevolucion)
      filas.push({
        id: `rem-${it.id}`,
        fecha: it.fechaDevolucion || it.remito.createdAt,
        fuente: devolucion ? 'DEVOLUCION' : 'REMITO',
        titulo: devolucion
          ? `Devolución · Remito N°${it.remito.numero}`
          : `Entrega · Remito N°${it.remito.numero}`,
        detalle: devolucion
          ? `Motivo: ${it.motivoDevolucion || 'sin especificar'}${
              it.devolucionRegistradaPor ? ` · registrada por ${it.devolucionRegistradaPor}` : ''
            }`
          : `Operación: ${it.tipoOperacion}`,
        cliente: it.remito.cliente || it.remito.clienteId || undefined,
        usuario: it.devolucionRegistradaPor || undefined,
        enlace: { tab: 'remitos' },
      })
    }

    for (const d of docsItems) {
      filas.push({
        id: `doc-${d.id}`,
        fecha: d.documento.fecha,
        fuente: 'DOCUMENTO',
        titulo: `${d.documento.tipoDocumento} ${d.documento.numeroFormateado}`,
        detalle: d.detalle || undefined,
        cliente: d.documento.clienteNombre || undefined,
        usuario: d.documento.usuarioNombre || undefined,
        enlace: { tab: 'facturacion' },
      })
    }

    for (const p of pedidos) {
      filas.push({
        id: `ped-${p.id}`,
        fecha: p.pedido.fecha,
        fuente: 'PEDIDO',
        titulo: `Pedido · ${p.pedido.estado}`,
        detalle: `Escaneado en pedido (${p.gasCodigo || ''})`,
        cliente: p.pedido.cliente || undefined,
        enlace: { tab: 'pedidos' },
      })
    }

    for (const l of lecturas) {
      filas.push({
        id: `pes-${l.id}`,
        fecha: l.fecha,
        fuente: 'LECTURA',
        titulo: 'Lectura de peso',
        detalle: `${l.pesoKg} kg`,
        enlace: null,
      })
    }

    for (const c of cargas) {
      filas.push({
        id: `cga-${c.id}`,
        fecha: c.carga.fecha,
        fuente: 'REPARTO',
        titulo: `Carga en vehículo ${c.carga.vehiculo.patente || ''}`,
        detalle: `Posición ${c.posicion} · ${c.carga.estado}`,
        enlace: { tab: 'rutas' },
      })
    }

    filas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    return NextResponse.json({
      tubeId: cylinder.id,
      numeroSerie: cylinder.numeroSerie,
      gas: cylinder.gas,
      total: filas.length,
      eventos: filas.slice(0, 300),
    })
  } catch (e) {
    console.error('GET historial', e)
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
  }
}