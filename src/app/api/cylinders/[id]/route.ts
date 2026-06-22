import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncCylinderToGraph } from '@/lib/neo4j'

// GET /api/cylinders/[id] - detalle completo de un tubo con movimientos
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cylinder = await db.cylinder.findUnique({
      where: { id },
      include: {
        gas: true,
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 50,
        },
      },
    })
    if (!cylinder) {
      return NextResponse.json({ error: 'Tubo no encontrado' }, { status: 404 })
    }
    return NextResponse.json(cylinder)
  } catch (e) {
    console.error('GET /api/cylinders/[id]', e)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// PUT /api/cylinders/[id] - actualizar tubo (campos normativos completos)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Cargar estado anterior para auditoría
    const anterior = await db.cylinder.findUnique({
      where: { id },
      include: { gas: true },
    })
    if (!anterior) {
      return NextResponse.json({ error: 'Tubo no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    // Identificación
    if (body.numeroSerie !== undefined) data.numeroSerie = body.numeroSerie
    if (body.propietario !== undefined) data.propietario = body.propietario || null
    if (body.fabricante !== undefined) data.fabricante = body.fabricante || null
    if (body.paisFabricacion !== undefined) data.paisFabricacion = body.paisFabricacion || null
    if (body.marcaUN !== undefined) data.marcaUN = Boolean(body.marcaUN)

    // Especificaciones
    if (body.normaFabricacion !== undefined) data.normaFabricacion = body.normaFabricacion || null
    if (body.presionTrabajoBar !== undefined)
      data.presionTrabajoBar = body.presionTrabajoBar ? parseInt(body.presionTrabajoBar, 10) : null
    if (body.roscacilindro !== undefined) data.roscacilindro = body.roscacilindro || null
    if (body.espesorMinParedMm !== undefined)
      data.espesorMinParedMm = body.espesorMinParedMm ? parseFloat(body.espesorMinParedMm) : null
    if (body.materialAleacion !== undefined) data.materialAleacion = body.materialAleacion || null

    // Pesos
    if (body.capacidadLitros !== undefined)
      data.capacidadLitros = parseInt(body.capacidadLitros, 10)
    if (body.pesoVacioKg !== undefined)
      data.pesoVacioKg = body.pesoVacioKg ? parseFloat(body.pesoVacioKg) : null
    if (body.pesoTaraKg !== undefined)
      data.pesoTaraKg = body.pesoTaraKg ? parseFloat(body.pesoTaraKg) : null
    if (body.pesoMaxLlenadoKg !== undefined)
      data.pesoMaxLlenadoKg = body.pesoMaxLlenadoKg ? parseFloat(body.pesoMaxLlenadoKg) : null

    // Inspección
    if (body.presionEnsayoBar !== undefined)
      data.presionEnsayoBar = body.presionEnsayoBar ? parseInt(body.presionEnsayoBar, 10) : null
    if (body.fechaEnsayoInicial !== undefined) data.fechaEnsayoInicial = body.fechaEnsayoInicial || null
    if (body.fechaUltimoRetest !== undefined)
      data.fechaUltimoRetest = body.fechaUltimoRetest ? new Date(body.fechaUltimoRetest) : null
    if (body.fechaProximoRetest !== undefined)
      data.fechaProximoRetest = new Date(body.fechaProximoRetest)
    if (body.resultadoInspeccion !== undefined) data.resultadoInspeccion = body.resultadoInspeccion
    if (body.inspectorId !== undefined) data.inspectorId = body.inspectorId || null
    if (body.laboratorio !== undefined) data.laboratorio = body.laboratorio || null
    if (body.metodoPrueba !== undefined) data.metodoPrueba = body.metodoPrueba || null

    // Gas y específicos
    if (body.gasId !== undefined) data.gasId = body.gasId
    if (body.presionActualBar !== undefined)
      data.presionActualBar = parseInt(body.presionActualBar, 10)
    if (body.masaPorosaId !== undefined) data.masaPorosaId = body.masaPorosaId || null
    if (body.tipoSolvente !== undefined) data.tipoSolvente = body.tipoSolvente || null
    if (body.solventeMasaKg !== undefined)
      data.solventeMasaKg = body.solventeMasaKg ? parseFloat(body.solventeMasaKg) : null

    // Vida útil y reparaciones
    if (body.vidaUtilLimite !== undefined)
      data.vidaUtilLimite = body.vidaUtilLimite ? new Date(body.vidaUtilLimite) : null
    if (body.reparaciones !== undefined) data.reparaciones = body.reparaciones || null
    if (body.observaciones !== undefined) data.observaciones = body.observaciones || null

    // Operativo
    if (body.estado !== undefined) data.estado = body.estado
    if (body.ubicacionLat !== undefined) data.ubicacionLat = parseFloat(body.ubicacionLat)
    if (body.ubicacionLng !== undefined) data.ubicacionLng = parseFloat(body.ubicacionLng)
    if (body.ubicacionNombre !== undefined) data.ubicacionNombre = body.ubicacionNombre
    if (body.provincia !== undefined) data.provincia = body.provincia
    if (body.cliente !== undefined) data.cliente = body.cliente || null
    if (body.fechaCarga !== undefined)
      data.fechaCarga = body.fechaCarga ? new Date(body.fechaCarga) : null
    if (body.compatibleH2 !== undefined) data.compatibleH2 = Boolean(body.compatibleH2)

    const updated = await db.cylinder.update({
      where: { id },
      data,
      include: { gas: true },
    })

    // Auditoría: registrar cambios relevantes
    const cambios: string[] = []
    if (body.estado && body.estado !== anterior.estado)
      cambios.push(`Estado: ${anterior.estado} → ${body.estado}`)
    if (body.ubicacionNombre && body.ubicacionNombre !== anterior.ubicacionNombre)
      cambios.push(`Ubicación: ${anterior.ubicacionNombre} → ${body.ubicacionNombre}`)
    if (body.cliente !== undefined && body.cliente !== anterior.cliente)
      cambios.push(`Cliente: ${anterior.cliente || '—'} → ${body.cliente || '—'}`)
    if (body.presionActualBar !== undefined && body.presionActualBar !== anterior.presionActualBar)
      cambios.push(`Presión: ${anterior.presionActualBar} → ${body.presionActualBar} bar`)
    if (body.resultadoInspeccion && body.resultadoInspeccion !== anterior.resultadoInspeccion)
      cambios.push(`Inspección: ${anterior.resultadoInspeccion} → ${body.resultadoInspeccion}`)

    if (cambios.length > 0) {
      await db.cylinderMovimiento.create({
        data: {
          cylinderId: id,
          tipo: cambios.some((c) => c.startsWith('Ubicación')) ? 'TRASLADO' : 'INSPECCION',
          descripcion: cambios.join(' | '),
          usuario: body.usuario || 'sistema',
          ubicacion: updated.ubicacionNombre,
          latOrigen: anterior.ubicacionLat,
          lngOrigen: anterior.ubicacionLng,
          latDestino: updated.ubicacionLat,
          lngDestino: updated.ubicacionLng,
        },
      })
    }

    // Sincronizar con Neo4j
    await syncCylinderToGraph({
      id: updated.id,
      numeroSerie: updated.numeroSerie,
      gasId: updated.gasId,
      gas: updated.gas,
      cliente: updated.cliente,
      ubicacionNombre: updated.ubicacionNombre,
      provincia: updated.provincia,
      inspectorId: updated.inspectorId,
      laboratorio: updated.laboratorio,
      fabricante: updated.fabricante,
      estado: updated.estado,
      capacidadLitros: updated.capacidadLitros,
      presionActualBar: updated.presionActualBar,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('PUT /api/cylinders/[id]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al actualizar' },
      { status: 500 }
    )
  }
}

// DELETE /api/cylinders/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.cylinder.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/cylinders/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
