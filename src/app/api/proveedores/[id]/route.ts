import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const proveedor = await db.proveedor.findUnique({ where: { id } })
    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }
    return NextResponse.json(proveedor)
  } catch (e) {
    console.error('GET /api/proveedores/[id]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener proveedor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const anterior = await db.proveedor.findUnique({ where: { id } })
    if (!anterior) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}

    if (body.nombre !== undefined) data.nombre = body.nombre.trim()
    if (body.nombreFantasia !== undefined) data.nombreFantasia = body.nombreFantasia || null
    if (body.direccion !== undefined) data.direccion = body.direccion || null
    if (body.localidad !== undefined) data.localidad = body.localidad || null
    if (body.provincia !== undefined) data.provincia = body.provincia || null
    if (body.codigoPostal !== undefined) data.codigoPostal = body.codigoPostal || null
    if (body.pais !== undefined) data.pais = body.pais || 'Argentina'
    if (body.telefono1 !== undefined) data.telefono1 = body.telefono1 || null
    if (body.telefono2 !== undefined) data.telefono2 = body.telefono2 || null
    if (body.telefono3 !== undefined) data.telefono3 = body.telefono3 || null
    if (body.telefono4 !== undefined) data.telefono4 = body.telefono4 || null
    if (body.telefono5 !== undefined) data.telefono5 = body.telefono5 || null
    if (body.email !== undefined) data.email = body.email || null
    if (body.tipoDocumento !== undefined) data.tipoDocumento = body.tipoDocumento != null ? parseInt(body.tipoDocumento, 10) : null
    if (body.tipoIva !== undefined) data.tipoIva = body.tipoIva != null ? parseInt(body.tipoIva, 10) : null
    if (body.numeroDocumento !== undefined) data.numeroDocumento = body.numeroDocumento || null
    if (body.habilitadoCheques !== undefined) data.habilitadoCheques = body.habilitadoCheques != null ? parseInt(body.habilitadoCheques, 10) : null
    if (body.limiteCheques !== undefined) data.limiteCheques = body.limiteCheques != null ? parseInt(body.limiteCheques, 10) : null
    if (body.credito !== undefined) data.credito = body.credito != null ? parseFloat(body.credito) : null
    if (body.vendedor !== undefined) data.vendedor = body.vendedor || null
    if (body.diaVisita !== undefined) data.diaVisita = body.diaVisita != null ? parseInt(body.diaVisita, 10) : null
    if (body.descuentoVto !== undefined) data.descuentoVto = body.descuentoVto != null ? parseFloat(body.descuentoVto) : null
    if (body.observacion1 !== undefined) data.observacion1 = body.observacion1 || null
    if (body.observacion2 !== undefined) data.observacion2 = body.observacion2 || null
    if (body.observacion3 !== undefined) data.observacion3 = body.observacion3 || null
    if (body.fechaAlta !== undefined) data.fechaAlta = body.fechaAlta || null
    if (body.contacto !== undefined) data.contacto = body.contacto || null
    if (body.ultimaVisita !== undefined) data.ultimaVisita = body.ultimaVisita || null
    if (body.saldo !== undefined) data.saldo = body.saldo != null ? parseFloat(body.saldo) : null
    if (body.descuentoRemito !== undefined) data.descuentoRemito = body.descuentoRemito != null ? parseInt(body.descuentoRemito, 10) : null
    if (body.web !== undefined) data.web = body.web || null
    if (body.listaPrecios !== undefined) data.listaPrecios = body.listaPrecios != null ? parseInt(body.listaPrecios, 10) : null
    if (body.condCompra !== undefined) data.condCompra = body.condCompra || null
    if (body.tipo !== undefined) data.tipo = body.tipo != null ? parseInt(body.tipo, 10) : null
    if (body.tipoNombre !== undefined) data.tipoNombre = body.tipoNombre || null
    if (body.numeroIB !== undefined) data.numeroIB = body.numeroIB || null
    if (body.activo !== undefined) data.activo = Boolean(body.activo)
    if (body.notas !== undefined) data.notas = body.notas || null
    if (body.codigoLegacy !== undefined) data.codigoLegacy = body.codigoLegacy != null ? parseInt(body.codigoLegacy, 10) : null

    const updated = await db.proveedor.update({ where: { id }, data })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('PUT /api/proveedores/[id]', e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al actualizar' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const proveedor = await db.proveedor.findUnique({ where: { id } })
    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }
    await db.proveedor.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/proveedores/[id]', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
