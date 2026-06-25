import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const clientes = await db.cliente.findMany({
      where: { activo: true },
      include: {
        _count: { select: { cylinders: true } },
      },
      orderBy: { nombre: 'asc' },
    })

    const facturas = await db.factura.findMany({
      select: { clienteId: true, cliente: true, total: true, totalGeneral: true, estado: true },
    })

    const ingresosPorCliente: Record<string, { clienteId: string; nombre: string; ingresos: number; facturas: number; pendiente: number }> = {}
    for (const f of facturas) {
      const key = f.clienteId || f.cliente
      if (!ingresosPorCliente[key]) ingresosPorCliente[key] = { clienteId: f.clienteId || '', nombre: f.cliente, ingresos: 0, facturas: 0, pendiente: 0 }
      ingresosPorCliente[key].ingresos += Number(f.totalGeneral)
      ingresosPorCliente[key].facturas++
      if (f.estado === 'PENDIENTE' || f.estado === 'VENCIDA') ingresosPorCliente[key].pendiente += Number(f.totalGeneral || f.total)
    }

    const topIngresos = Object.values(ingresosPorCliente).sort((a, b) => b.ingresos - a.ingresos).slice(0, 10)

    const estadoCuentaCounts: Record<string, number> = {}
    for (const c of clientes) {
      const ec = c.estadoCuenta || 'SIN_DATO'
      estadoCuentaCounts[ec] = (estadoCuentaCounts[ec] || 0) + 1
    }

    const cuentas = Object.entries(estadoCuentaCounts).map(([estado, cantidad]) => ({ estado, cantidad }))

    const clientesConCilindros = clientes.filter(c => c._count.cylinders > 0).sort((a, b) => b._count.cylinders - a._count.cylinders).slice(0, 10)

    const totalClientes = clientes.length
    const conDeuda = facturas.filter(f => f.estado === 'VENCIDA' || f.estado === 'PENDIENTE').length
    const totalDeuda = facturas.filter(f => f.estado === 'VENCIDA' || f.estado === 'PENDIENTE').reduce((s, f) => s + Number(f.totalGeneral || f.total), 0)

    return NextResponse.json({
      topClientes: topIngresos,
      estadoCuenta: cuentas,
      topCilindros: clientesConCilindros.map(c => ({ nombre: c.nombre, taxId: c.taxId, cantidad: c._count.cylinders, tipologia: c.tipologia, estadoCuenta: c.estadoCuenta })),
      resumen: { totalClientes, conDeuda, totalDeuda },
    })
  } catch (e) {
    console.error('GET /api/stats/analytics/clientes', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
