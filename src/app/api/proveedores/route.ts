import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get('nombre') || undefined
    const localidad = searchParams.get('localidad') || undefined
    const provincia = searchParams.get('provincia') || undefined
    const activo = searchParams.get('activo')
    const letra = searchParams.get('letra') || undefined
    const hasPage = searchParams.has('page')
    const page = hasPage ? Math.max(1, parseInt(searchParams.get('page') || '1')) : 1
    const limit = hasPage ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12'))) : 9999

    const andConditions: Record<string, unknown>[] = []

    if (nombre) {
      andConditions.push({
        nombre: { contains: nombre, mode: 'insensitive' as const },
      })
    }

    if (letra && letra !== 'TODOS') {
      andConditions.push({
        nombre: { startsWith: letra, mode: 'insensitive' as const },
      })
    }

    const where: Record<string, unknown> = {}
    if (localidad) where.localidad = { contains: localidad, mode: 'insensitive' as const }
    if (provincia) where.provincia = { contains: provincia, mode: 'insensitive' as const }
    if (activo === 'true') where.activo = true
    if (activo === 'false') where.activo = false
    if (andConditions.length === 1) where.AND = andConditions[0]
    else if (andConditions.length > 1) where.AND = andConditions

    const queryWhere = Object.keys(where).length > 0 ? where : undefined
    const skip = hasPage ? (page - 1) * limit : 0

    const [proveedores, total] = await Promise.all([
      db.proveedor.findMany({
        where: queryWhere,
        orderBy: { nombre: 'asc' },
        skip,
        take: limit,
      }),
      db.proveedor.count({ where: queryWhere }),
    ])

    if (!hasPage) return NextResponse.json(proveedores)

    return NextResponse.json({
      proveedores,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e) {
    console.error('GET /api/proveedores', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.nombre || typeof body.nombre !== 'string' || body.nombre.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre/razón social es obligatorio' },
        { status: 400 }
      )
    }

    const existente = await db.proveedor.findUnique({
      where: { nombre: body.nombre.trim() },
    })
    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un proveedor con ese nombre' },
        { status: 400 }
      )
    }

    const data: any = {
      nombre: body.nombre.trim(),
      nombreFantasia: body.nombreFantasia || null,
      direccion: body.direccion || null,
      localidad: body.localidad || null,
      provincia: body.provincia || null,
      codigoPostal: body.codigoPostal || null,
      pais: body.pais || 'Argentina',
      telefono1: body.telefono1 || null,
      telefono2: body.telefono2 || null,
      telefono3: body.telefono3 || null,
      telefono4: body.telefono4 || null,
      telefono5: body.telefono5 || null,
      email: body.email || null,
      tipoDocumento: body.tipoDocumento != null ? parseInt(body.tipoDocumento, 10) : null,
      tipoIva: body.tipoIva != null ? parseInt(body.tipoIva, 10) : null,
      numeroDocumento: body.numeroDocumento || null,
      habilitadoCheques: body.habilitadoCheques != null ? parseInt(body.habilitadoCheques, 10) : null,
      limiteCheques: body.limiteCheques != null ? parseInt(body.limiteCheques, 10) : null,
      credito: body.credito != null ? parseFloat(body.credito) : null,
      vendedor: body.vendedor || null,
      diaVisita: body.diaVisita != null ? parseInt(body.diaVisita, 10) : null,
      descuentoVto: body.descuentoVto != null ? parseFloat(body.descuentoVto) : null,
      observacion1: body.observacion1 || null,
      observacion2: body.observacion2 || null,
      observacion3: body.observacion3 || null,
      fechaAlta: body.fechaAlta || null,
      contacto: body.contacto || null,
      ultimaVisita: body.ultimaVisita || null,
      saldo: body.saldo != null ? parseFloat(body.saldo) : null,
      descuentoRemito: body.descuentoRemito != null ? parseInt(body.descuentoRemito, 10) : null,
      web: body.web || null,
      listaPrecios: body.listaPrecios != null ? parseInt(body.listaPrecios, 10) : null,
      condCompra: body.condCompra || null,
      tipo: body.tipo != null ? parseInt(body.tipo, 10) : null,
      tipoNombre: body.tipoNombre || null,
      numeroIB: body.numeroIB || null,
      activo: body.activo !== undefined ? Boolean(body.activo) : true,
      notas: body.notas || null,
      codigoLegacy: body.codigoLegacy != null ? parseInt(body.codigoLegacy, 10) : null,
    }

    const proveedor = await db.proveedor.create({ data })

    return NextResponse.json(proveedor, { status: 201 })
  } catch (e) {
    console.error('POST /api/proveedores', e instanceof Error ? e.message : String(e))
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al crear proveedor' },
      { status: 500 }
    )
  }
}
