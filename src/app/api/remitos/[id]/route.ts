import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { registrarMovimientoTubo, motivoDevolucionAEstado } from '@/lib/trazabilidad'
import { getRequestUser } from '@/lib/api-auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const remito = await db.remito.findUnique({ where: { id }, include: { items: true } })
    if (!remito) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(remito)
  } catch (e) {
    console.error('GET /api/remitos/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { estado, tecnico, observaciones, clienteId, cliente, items } = body
    const user = getRequestUser(req)
    const usuarioNombre = user?.nombre || user?.usuario || null

    const result = await db.$transaction(async (tx) => {
      const existente = await tx.remito.findUnique({
        where: { id },
        include: { items: true },
      })
      if (!existente) throw new Error('Remito no encontrado')

      const header = await tx.remito.update({
        where: { id },
        data: {
          clienteId: clienteId !== undefined ? (clienteId || null) : undefined,
          cliente: cliente !== undefined ? (cliente || null) : undefined,
          estado: estado ?? undefined,
          tecnico: tecnico ?? undefined,
          observaciones: observaciones ?? undefined,
        },
      })

      const existentes = new Set(existente.items.map((i) => i.id))
      const recibidos = new Set<string>()
      const nuevos: any[] = []
      const actualizados: any[] = []

      for (const it of items || []) {
        if (it.id && existentes.has(it.id)) {
          recibidos.add(it.id)
          const prev = existente.items.find((e) => e.id === it.id)
          const updated = await tx.remitoItem.update({
            where: { id: it.id },
            data: {
              cylinderId: it.cylinderId || null,
              numeroSerie: it.numeroSerie || null,
              gasId: it.gasId,
              gasCodigo: it.gasCodigo,
              tipoOperacion: it.tipoOperacion || 'ALQUILER',
              cantidad: it.cantidad || 1,
              fechaDevolucion: it.fechaDevolucion ? new Date(it.fechaDevolucion) : null,
              motivoDevolucion: it.motivoDevolucion || null,
              devolucionRegistradaPor: it.motivoDevolucion ? usuarioNombre || 'anónimo' : null,
              diasAlquiler: it.diasAlquiler ?? null,
              precioUnitario: it.precioUnitario ?? null,
              subtotal: it.subtotal ?? null,
            },
          })
          actualizados.push(updated)

          const devolucionNueva = it.fechaDevolucion && prev?.fechaDevolucion === null && it.cylinderId
          if (devolucionNueva) {
            const estadoNuevo = it.motivoDevolucion
              ? motivoDevolucionAEstado(it.motivoDevolucion)
              : 'EN_DEPOSITO'
            await registrarMovimientoTubo(
              {
                cylinderId: it.cylinderId,
                accion: 'DEVOLUCION',
                tipoMovimiento: 'DEVOLUCION',
                descripcion: `Devolución remito N°${existente.numero} (${it.motivoDevolucion || 'SIN_MOTIVO'})`,
                estadoAnterior: 'EN_CLIENTE',
                estadoNuevo,
                clienteId: null,
                clienteNombre: null,
                usuarioId: user?.id || null,
                usuarioNombre,
                remitoId: id,
                origen: 'PORTAL_UHF',
              },
              tx,
            )
          }
        } else {
          const nuevo = await tx.remitoItem.create({
            data: {
              remitoId: id,
              cylinderId: it.cylinderId || null,
              numeroSerie: it.numeroSerie || null,
              gasId: it.gasId,
              gasCodigo: it.gasCodigo,
              tipoOperacion: it.tipoOperacion || 'ALQUILER',
              cantidad: it.cantidad || 1,
              fechaDevolucion: it.fechaDevolucion ? new Date(it.fechaDevolucion) : null,
              motivoDevolucion: (it.motivoDevolucion || null) as any,
              devolucionRegistradaPor: it.motivoDevolucion ? usuarioNombre || 'anónimo' : null,
              diasAlquiler: it.diasAlquiler ?? null,
              precioUnitario: it.precioUnitario ?? null,
              subtotal: it.subtotal ?? null,
            },
          })
          nuevos.push(nuevo)

          if (it.cylinderId) {
            const esDevolucion =
              it.tipoOperacion === 'DEVOLUCION' || Boolean(it.fechaDevolucion || it.motivoDevolucion)
            if (esDevolucion) {
              const estadoNuevo = it.motivoDevolucion
                ? motivoDevolucionAEstado(it.motivoDevolucion)
                : 'EN_DEPOSITO'
              await registrarMovimientoTubo(
                {
                  cylinderId: it.cylinderId,
                  accion: 'DEVOLUCION',
                  tipoMovimiento: 'DEVOLUCION',
                  descripcion: `Devolución remito N°${existente.numero} (${it.motivoDevolucion || 'SIN_MOTIVO'})`,
                  estadoAnterior: 'EN_CLIENTE',
                  estadoNuevo,
                  clienteId: null,
                  clienteNombre: null,
                  usuarioId: user?.id || null,
                  usuarioNombre,
                  remitoId: id,
                  origen: 'PORTAL_UHF',
                },
                tx,
              )
            } else {
              await registrarMovimientoTubo(
                {
                  cylinderId: it.cylinderId,
                  accion: 'ENTREGA',
                  tipoMovimiento: 'ENTREGA',
                  descripcion: `Entrega remito N°${existente.numero}${
                    cliente ?? existente.cliente ? ` - ${cliente ?? existente.cliente}` : ''
                  }`,
                  estadoNuevo: 'EN_CLIENTE',
                  clienteId: clienteId !== undefined ? clienteId || null : existente.clienteId || null,
                  clienteNombre: cliente !== undefined ? cliente || null : existente.cliente || null,
                  usuarioId: user?.id || null,
                  usuarioNombre,
                  remitoId: id,
                  origen: 'PORTAL_UHF',
                },
                tx,
              )
            }
          }
        }
      }

      const idsAEliminar = existente.items.filter((i) => !recibidos.has(i.id)).map((i) => i.id)
      if (idsAEliminar.length > 0) {
        await tx.remitoItem.deleteMany({ where: { id: { in: idsAEliminar } } })
      }

      return { ...header, items: [...actualizados, ...nuevos] }
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('PUT /api/remitos/[id]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.remito.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/remitos/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
