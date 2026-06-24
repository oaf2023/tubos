import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface GraphNode {
  id: string
  label: string
  type: string
  properties: Record<string, unknown>
}

interface GraphEdge {
  source: string
  target: string
  type: string
  properties: Record<string, unknown>
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const cylinder = await db.cylinder.findUnique({
      where: { id },
      include: { gas: true },
    })

    if (!cylinder) {
      return NextResponse.json({ error: 'Cilindro no encontrado' }, { status: 404 })
    }

    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const nodeIds = new Set<string>()

    // Cylinder node (centro del grafo)
    const cid = `cyl-${cylinder.id}`
    nodeIds.add(cid)
    nodes.push({
      id: cid,
      label: cylinder.numeroSerie,
      type: 'Cylinder',
      properties: {
        estado: cylinder.estado,
        capacidad: cylinder.capacidadLitros,
        presion: cylinder.presionActualBar,
        ubicacion: cylinder.ubicacionNombre,
      },
    })

    // Gas
    const gid = `gas-${cylinder.gas.id}`
    if (!nodeIds.has(gid)) {
      nodeIds.add(gid)
      nodes.push({
        id: gid,
        label: cylinder.gas.nombre,
        type: 'Gas',
        properties: { codigo: cylinder.gas.codigo, colorHex: cylinder.gas.colorHex },
      })
    }
    edges.push({ source: cid, target: gid, type: 'CONTENE', properties: {} })

    // Cliente
    if (cylinder.cliente) {
      const clid = `cliente-${cylinder.cliente}`
      if (!nodeIds.has(clid)) {
        nodeIds.add(clid)
        nodes.push({ id: clid, label: cylinder.cliente, type: 'Cliente', properties: {} })
      }
      edges.push({ source: cid, target: clid, type: 'ASIGNADO_A', properties: {} })
    }

    // Location
    if (cylinder.ubicacionNombre) {
      const lid = `location-${cylinder.ubicacionNombre}`
      if (!nodeIds.has(lid)) {
        nodeIds.add(lid)
        nodes.push({
          id: lid,
          label: cylinder.ubicacionNombre,
          type: 'Location',
          properties: { provincia: cylinder.provincia },
        })
      }
      edges.push({ source: cid, target: lid, type: 'UBICADO_EN', properties: {} })
    }

    // Movements (up to 20)
    const movimientos = await db.cylinderMovimiento.findMany({
      where: { cylinderId: id },
      orderBy: { fecha: 'desc' },
      take: 20,
    })
    for (const mov of movimientos) {
      const mid = `mov-${mov.id}`
      nodeIds.add(mid)
      nodes.push({
        id: mid,
        label: `${mov.tipo} (${mov.fecha.toISOString().split('T')[0]})`,
        type: 'Movimiento',
        properties: { tipo: mov.tipo, ubicacion: mov.ubicacion, fecha: mov.fecha.toISOString() },
      })
      edges.push({ source: cid, target: mid, type: 'HISTORICO', properties: {} })
    }

    // Maintenance (up to 10)
    const mantenimientos = await db.mantenimiento.findMany({
      where: { cylinderId: id },
      orderBy: { fecha: 'desc' },
      take: 10,
    })
    for (const mant of mantenimientos) {
      const mid = `mant-${mant.id}`
      nodeIds.add(mid)
      nodes.push({
        id: mid,
        label: `${mant.tipo} (${mant.fecha.toISOString().split('T')[0]})`,
        type: 'Mantenimiento',
        properties: { tipo: mant.tipo, tecnico: mant.tecnico, costo: mant.costo, descripcion: mant.descripcion },
      })
      edges.push({ source: cid, target: mid, type: 'MANTENIMIENTO', properties: {} })
    }

    return NextResponse.json({ nodes, edges, source: 'sqlite' })
  } catch (e) {
    console.error('GET /api/cylinders/[id]/graph', e)
    return NextResponse.json({ error: 'Error al obtener grafo' }, { status: 500 })
  }
}
