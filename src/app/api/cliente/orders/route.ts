import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

function getUser(req: NextRequest) {
  const header = req.headers.get('x-user')
  if (!header) return null
  try { return JSON.parse(header) } catch { return null }
}

export async function GET(req: NextRequest) {
  try {
    const user = getUser(req)
    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado')
    const clienteId = searchParams.get('clienteId')

    const where: any = {}
    if (user?.tipo === 'cliente') {
      where.clienteId = user.clienteId
    }
    if (clienteId) where.clienteId = clienteId
    if (estado) where.estado = estado

    const orders = await db.pedidoLectura.findMany({
      where,
      include: {
        items: {
          include: { cylinder: { include: { gas: true } } },
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (e) {
    console.error('GET /api/cliente/orders', e)
    return NextResponse.json({ error: 'Error al listar pedidos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUser(req)
    const body = await req.json()
    const { clienteId, clienteNombre, obraId, obraNombre, observacion, prioridad, contactoObra } = body

    const userId = user?.tipo === 'cliente' ? null : (user?.id || null)
    const targetClienteId = user?.tipo === 'cliente' ? user.clienteId : clienteId
    const targetClienteNombre = user?.tipo === 'cliente' ? user.nombre : clienteNombre

    if (!targetClienteId || !targetClienteNombre) {
      return NextResponse.json({ error: 'Cliente requerido' }, { status: 400 })
    }

    const pedido = await db.pedidoLectura.create({
      data: {
        clienteId: targetClienteId,
        clienteNombre: targetClienteNombre,
        obraId: obraId || null,
        obraNombre: obraNombre || null,
        usuarioId: userId,
        usuarioNombre: user?.nombre || null,
        observacion: observacion || null,
        prioridad: prioridad || 'NORMAL',
        contactoObra: contactoObra || null,
        estado: 'BORRADOR',
      },
    })

    await logAudit({
      accion: 'CREATE',
      entidad: 'PedidoLectura',
      entidadId: pedido.id,
      usuario: user?.usuario || 'cliente',
      detalle: { clienteId: targetClienteId },
    })

    return NextResponse.json(pedido, { status: 201 })
  } catch (e) {
    console.error('POST /api/cliente/orders', e)
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
  }
}
