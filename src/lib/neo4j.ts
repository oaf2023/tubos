import { db } from '@/lib/db'
import neo4j, { type Driver } from 'neo4j-driver'

let driver: Driver | null = null
let connectionTried = false
let connectionOk = false

function isEnabled(): boolean {
  return process.env.NEO4J_ENABLED === 'true'
}

function getDriver(): Driver | null {
  if (!isEnabled()) return null
  if (driver) return driver
  if (connectionTried) return driver
  connectionTried = true
  try {
    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'gastrack123'),
    )
    return driver
  } catch {
    return null
  }
}

export async function isNeo4jConnected(): Promise<boolean> {
  if (!isEnabled()) return false
  const d = getDriver()
  if (!d) return false
  if (connectionOk) return true
  try {
    await d.verifyConnectivity()
    connectionOk = true
    return true
  } catch {
    return false
  }
}

export type GraphNodeType =
  | 'Cylinder' | 'Gas' | 'Cliente' | 'Location' | 'Inspector'
  | 'Fabricante' | 'Ruta' | 'Movimiento' | 'Mantenimiento'

export interface GraphNode {
  id: string; label: string; type: GraphNodeType
  properties: Record<string, unknown>
}

export interface GraphEdge {
  source: string; target: string; type: string
  properties?: Record<string, unknown>
}

export interface GraphData {
  nodes: GraphNode[]; edges: GraphEdge[]; source: 'neo4j' | 'mock'
}

// ─── helpers ────────────────────────────────────────────────
function run(session: ReturnType<Driver['session']>, query: string, params: Record<string, unknown>) {
  return session.run(query, params)
}

// ─── sync: cylinder current state (with historical close) ──
export async function syncCylinderToGraph(cylinder: {
  id: string; numeroSerie: string; gasId: string
  gas?: { id: string; nombre: string; codigo: string }
  cliente: string | null; ubicacionNombre: string; provincia: string
  inspectorId: string | null; laboratorio: string | null; fabricante: string | null
  estado: string; capacidadLitros: number; presionActualBar: number
}): Promise<void> {
  const d = getDriver()
  if (!d) return
  const s = d.session()
  try {
    const fecha = new Date().toISOString()
    await run(s, `MERGE (c:Cylinder {id: $id})
       SET c.numeroSerie = $serie, c.estado = $estado,
           c.capacidad = $cap, c.presion = $pres, c.ubicacion = $ubi`,
      { id: cylinder.id, serie: cylinder.numeroSerie, estado: cylinder.estado, cap: cylinder.capacidadLitros, pres: cylinder.presionActualBar, ubi: cylinder.ubicacionNombre })

    // Gas
    if (cylinder.gas) {
      await run(s, `MERGE (g:Gas {id: $gid}) SET g.nombre = $gn, g.codigo = $gc
         MERGE (c:Cylinder {id: $cid})-[:CONTIENE]->(g)`,
        { gid: cylinder.gas.id, gn: cylinder.gas.nombre, gc: cylinder.gas.codigo, cid: cylinder.id })
    }

    // Cliente — histórico: cierra anterior, crea nueva
    await run(s, `MATCH (c:Cylinder {id: $cid})-[r:ASIGNADO_A]->(:Cliente)
       WHERE r.hasta IS NULL SET r.hasta = datetime($fecha)`,
      { cid: cylinder.id, fecha })
    if (cylinder.cliente) {
      await run(s, `MATCH (c:Cylinder {id: $cid})
         MERGE (cl:Cliente {nombre: $cli})
         CREATE (c)-[:ASIGNADO_A {desde: datetime($fecha), hasta: NULL}]->(cl)`,
        { cid: cylinder.id, cli: cylinder.cliente, fecha })
    }

    // Location — histórico
    await run(s, `MATCH (c:Cylinder {id: $cid})-[r:UBICADO_EN]->(:Location)
       WHERE r.hasta IS NULL SET r.hasta = datetime($fecha)`,
      { cid: cylinder.id, fecha })
    await run(s, `MATCH (c:Cylinder {id: $cid})
       MERGE (l:Location {nombre: $loc})
       CREATE (c)-[:UBICADO_EN {desde: datetime($fecha), hasta: NULL}]->(l)`,
      { cid: cylinder.id, loc: cylinder.ubicacionNombre, fecha })

    // Inspector
    if (cylinder.inspectorId) {
      await run(s, `MERGE (i:Inspector {id: $iid})
         MERGE (c:Cylinder {id: $cid})-[:INSPECCIONADO_POR]->(i)`,
        { iid: cylinder.inspectorId, cid: cylinder.id })
    }

    // Fabricante
    if (cylinder.fabricante) {
      await run(s, `MERGE (f:Fabricante {nombre: $fab})
         MERGE (c:Cylinder {id: $cid})-[:FABRICADO_POR]->(f)`,
        { fab: cylinder.fabricante, cid: cylinder.id })
    }
  } finally { await s.close() }
}

// ─── sync: movement event as graph node ────────────────────
export async function syncMovementToGraph(mov: {
  id: string; cylinderId: string; tipo: string; descripcion: string
  usuario: string | null; ubicacion: string | null; fecha: Date
}): Promise<void> {
  const d = getDriver()
  if (!d) return
  const s = d.session()
  try {
    await run(s, `MATCH (c:Cylinder {id: $cid})
       CREATE (c)-[:HISTORICO]->(m:Movimiento {
         id: $mid, tipo: $tipo, descripcion: $desc,
         usuario: $usr, ubicacion: $ubi, fecha: datetime($fec)
       })`,
      {
        cid: mov.cylinderId, mid: mov.id, tipo: mov.tipo,
        desc: mov.descripcion, usr: mov.usuario || 'sistema',
        ubi: mov.ubicacion || '', fec: mov.fecha.toISOString(),
      })
  } finally { await s.close() }
}

// ─── sync: maintenance event as graph node ─────────────────
export async function syncMantenimientoToGraph(mant: {
  id: string; cylinderId: string; tipo: string; descripcion: string | null
  tecnico: string | null; costo: number | null; fecha: Date
}): Promise<void> {
  const d = getDriver()
  if (!d) return
  const s = d.session()
  try {
    await run(s, `MATCH (c:Cylinder {id: $cid})
       CREATE (c)-[:MANTENIMIENTO]->(m:Mantenimiento {
         id: $mid, tipo: $tipo, descripcion: $desc,
         tecnico: $tec, costo: $cost, fecha: datetime($fec)
       })`,
      {
        cid: mant.cylinderId, mid: mant.id, tipo: mant.tipo,
        desc: mant.descripcion || '', tec: mant.tecnico || '',
        cost: mant.costo ?? 0, fec: mant.fecha.toISOString(),
      })
  } finally { await s.close() }
}

// ─── get full history of a cylinder ────────────────────────
export async function getCylinderHistory(cylinderId: string): Promise<{
  source: 'neo4j' | 'mock'
  asignaciones: { cliente: string; desde: string; hasta: string | null }[]
  ubicaciones: { ubicacion: string; desde: string; hasta: string | null }[]
  movimientos: { id: string; tipo: string; descripcion: string; fecha: string }[]
  mantenimientos: { id: string; tipo: string; descripcion: string | null; fecha: string; tecnico: string | null; costo: number | null }[]
}> {
  const connected = await isNeo4jConnected()
  if (connected) {
    const d = getDriver()!
    const s = d.session()
    try {
      const [asigRes, ubiRes, movRes, mantRes] = await Promise.all([
        s.run(`MATCH (c:Cylinder {id: $cid})-[r:ASIGNADO_A]->(cl:Cliente)
               RETURN cl.nombre AS cliente, r.desde AS desde, r.hasta AS hasta ORDER BY r.desde`,
               { cid: cylinderId }),
        s.run(`MATCH (c:Cylinder {id: $cid})-[r:UBICADO_EN]->(l:Location)
               RETURN l.nombre AS ubicacion, r.desde AS desde, r.hasta AS hasta ORDER BY r.desde`,
               { cid: cylinderId }),
        s.run(`MATCH (c:Cylinder {id: $cid})-[:HISTORICO]->(m:Movimiento)
               RETURN m.id AS id, m.tipo AS tipo, m.descripcion AS descripcion,
                      m.fecha AS fecha ORDER BY m.fecha`,
               { cid: cylinderId }),
        s.run(`MATCH (c:Cylinder {id: $cid})-[:MANTENIMIENTO]->(m:Mantenimiento)
               RETURN m.id AS id, m.tipo AS tipo, m.descripcion AS descripcion,
                      m.tecnico AS tecnico, m.costo AS costo, m.fecha AS fecha
               ORDER BY m.fecha`, { cid: cylinderId }),
      ])
      return {
        source: 'neo4j',
        asignaciones: asigRes.records.map((r) => ({
          cliente: r.get('cliente'), desde: r.get('desde')?.toString() || '',
          hasta: r.get('hasta')?.toString() || null,
        })),
        ubicaciones: ubiRes.records.map((r) => ({
          ubicacion: r.get('ubicacion'), desde: r.get('desde')?.toString() || '',
          hasta: r.get('hasta')?.toString() || null,
        })),
        movimientos: movRes.records.map((r) => ({
          id: r.get('id'), tipo: r.get('tipo'), descripcion: r.get('descripcion'),
          fecha: r.get('fecha')?.toString() || '',
        })),
        mantenimientos: mantRes.records.map((r) => ({
          id: r.get('id'), tipo: r.get('tipo'), descripcion: r.get('descripcion'),
          fecha: r.get('fecha')?.toString() || '',
          tecnico: r.get('tecnico'), costo: r.get('costo') ? Number(r.get('costo')) : null,
        })),
      }
    } finally { await s.close() }
  }

  // Mock desde SQLite
  const [movimientos, mantenimientos] = await Promise.all([
    db.cylinderMovimiento.findMany({ where: { cylinderId }, orderBy: { fecha: 'asc' } }),
    db.mantenimiento.findMany({ where: { cylinderId }, orderBy: { fecha: 'asc' } }),
  ])
  const cyl = await db.cylinder.findUnique({ where: { id: cylinderId }, include: { clienteRel: true } })
  return {
    source: 'mock',
    asignaciones: cyl?.cliente ? [{ cliente: cyl.cliente, desde: cyl.createdAt.toISOString(), hasta: null }] : [],
    ubicaciones: [{ ubicacion: cyl?.ubicacionNombre || '', desde: cyl?.createdAt.toISOString() || '', hasta: null }],
    movimientos: movimientos.map((m) => ({ id: m.id, tipo: m.tipo, descripcion: m.descripcion, fecha: m.fecha.toISOString() })),
    mantenimientos: mantenimientos.map((m) => ({ id: m.id, tipo: m.tipo, descripcion: m.descripcion, fecha: m.fecha.toISOString(), tecnico: m.tecnico, costo: m.costo })),
  }
}

// ─── init constraints ──────────────────────────────────────
export async function initNeo4jSchema(): Promise<void> {
  const d = getDriver()
  if (!d) return
  const s = d.session()
  try {
    await s.run('CREATE CONSTRAINT cylinder_id IF NOT EXISTS FOR (c:Cylinder) REQUIRE c.id IS UNIQUE')
    await s.run('CREATE CONSTRAINT gas_id IF NOT EXISTS FOR (g:Gas) REQUIRE g.id IS UNIQUE')
    await s.run('CREATE CONSTRAINT cliente_nombre IF NOT EXISTS FOR (cl:Cliente) REQUIRE cl.nombre IS UNIQUE')
    await s.run('CREATE CONSTRAINT location_nombre IF NOT EXISTS FOR (l:Location) REQUIRE l.nombre IS UNIQUE')
    await s.run('CREATE CONSTRAINT inspector_id IF NOT EXISTS FOR (i:Inspector) REQUIRE i.id IS UNIQUE')
    await s.run('CREATE CONSTRAINT fabricante_nombre IF NOT EXISTS FOR (f:Fabricante) REQUIRE f.nombre IS UNIQUE')
  } finally { await s.close() }
}

// ─── get full graph for visualization ──────────────────────
export async function getGraphData(
  sqliteData: {
    cylinders: Array<{
      id: string; numeroSerie: string; estado: string; capacidadLitros: number; presionActualBar: number
      cliente: string | null; ubicacionNombre: string; provincia: string
      inspectorId: string | null; fabricante: string | null
      gas: { id: string; nombre: string; codigo: string; colorHex: string; categoria: string }
    }>
  },
  filter?: { gasId?: string; estado?: string; cliente?: string },
): Promise<GraphData> {
  const connected = await isNeo4jConnected()
  if (connected) return getGraphFromNeo4j(filter)
  return buildGraphInMemory(sqliteData, filter)
}

async function getGraphFromNeo4j(filter?: { gasId?: string; estado?: string; cliente?: string }): Promise<GraphData> {
  const d = getDriver()!
  const s = d.session()
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()
  try {
    const conditions: string[] = []
    const params: Record<string, unknown> = {}
    if (filter?.gasId) { conditions.push('g.id = $gasId'); params.gasId = filter.gasId }
    if (filter?.estado) { conditions.push('c.estado = $estado'); params.estado = filter.estado }
    if (filter?.cliente) { conditions.push('cl.nombre = $cliente'); params.cliente = filter.cliente }
    const w = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await s.run(`MATCH (c:Cylinder)-[r]->(n) ${w} RETURN c, r, n, labels(n) as labels LIMIT 500`, params)
    for (const rec of result.records) {
      const cp = rec.get('c').properties; const np = rec.get('n').properties
      const rt = rec.get('r').type; const lbs = rec.get('labels') as string[]
      const cid = `cyl-${cp.id}`
      if (!nodeIds.has(cid)) {
        nodeIds.add(cid)
        nodes.push({ id: cid, label: cp.numeroSerie || cp.id, type: 'Cylinder', properties: { estado: cp.estado, capacidad: cp.capacidad, presion: cp.presion, ubicacion: cp.ubicacion } })
      }
      const tid = `${lbs[0].toLowerCase()}-${np.id || np.nombre || np.codigo}`
      if (!nodeIds.has(tid)) {
        nodeIds.add(tid)
        nodes.push({ id: tid, label: np.nombre || np.codigo || np.id, type: lbs[0] as GraphNodeType, properties: np })
      }
      edges.push({ source: cid, target: tid, type: rt, properties: { desde: rec.get('r').properties.desde?.toString(), hasta: rec.get('r').properties.hasta?.toString() } })
    }
  } finally { await s.close() }
  return { nodes, edges, source: 'neo4j' }
}

function buildGraphInMemory(
  data: { cylinders: Array<{ id: string; numeroSerie: string; estado: string; capacidadLitros: number; presionActualBar: number; cliente: string | null; ubicacionNombre: string; provincia: string; inspectorId: string | null; fabricante: string | null; gas: { id: string; nombre: string; codigo: string; colorHex: string; categoria: string } }> },
  filter?: { gasId?: string; estado?: string; cliente?: string },
): GraphData {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()
  const filtered = data.cylinders.filter((c) => {
    if (filter?.gasId && c.gas.id !== filter?.gasId) return false
    if (filter?.estado && c.estado !== filter?.estado) return false
    if (filter?.cliente && c.cliente !== filter?.cliente) return false
    return true
  }).slice(0, 60)

  for (const c of filtered) {
    const cid = `cyl-${c.id}`
    if (!nodeIds.has(cid)) {
      nodeIds.add(cid)
      nodes.push({ id: cid, label: c.numeroSerie, type: 'Cylinder', properties: { estado: c.estado, capacidad: c.capacidadLitros, presion: c.presionActualBar, ubicacion: c.ubicacionNombre } })
    }
    const gid = `gas-${c.gas.id}`
    if (!nodeIds.has(gid)) { nodeIds.add(gid); nodes.push({ id: gid, label: c.gas.nombre, type: 'Gas', properties: { codigo: c.gas.codigo, color: c.gas.colorHex, categoria: c.gas.categoria } }) }
    edges.push({ source: cid, target: gid, type: 'CONTIENE' })
    if (c.cliente) {
      const clid = `cli-${c.cliente.replace(/\s+/g, '_')}`
      if (!nodeIds.has(clid)) { nodeIds.add(clid); nodes.push({ id: clid, label: c.cliente, type: 'Cliente', properties: { nombre: c.cliente } }) }
      edges.push({ source: cid, target: clid, type: 'ASIGNADO_A', properties: { desde: new Date().toISOString(), hasta: null } })
    }
    const loc = `loc-${c.ubicacionNombre.replace(/\s+/g, '_')}`
    if (!nodeIds.has(loc)) { nodeIds.add(loc); nodes.push({ id: loc, label: c.ubicacionNombre, type: 'Location', properties: { provincia: c.provincia } }) }
    edges.push({ source: cid, target: loc, type: 'UBICADO_EN', properties: { desde: new Date().toISOString(), hasta: null } })
    if (c.inspectorId) {
      const iid = `insp-${c.inspectorId}`
      if (!nodeIds.has(iid)) { nodeIds.add(iid); nodes.push({ id: iid, label: c.inspectorId, type: 'Inspector', properties: { id: c.inspectorId } }) }
      edges.push({ source: cid, target: iid, type: 'INSPECCIONADO_POR' })
    }
    if (c.fabricante) {
      const fid = `fab-${c.fabricante.replace(/\s+/g, '_')}`
      if (!nodeIds.has(fid)) { nodeIds.add(fid); nodes.push({ id: fid, label: c.fabricante, type: 'Fabricante', properties: { nombre: c.fabricante } }) }
      edges.push({ source: cid, target: fid, type: 'FABRICADO_POR' })
    }
  }
  return { nodes, edges, source: 'mock' }
}

// ─── analytics (SQLite-based) ──────────────────────────────
export async function getGraphAnalytics(): Promise<{
  source: 'neo4j' | 'mock'
  clientesConMasTubos: { cliente: string; cantidad: number }[]
  gasesMasUsados: { gas: string; cantidad: number }[]
  ubicacionesConMasTubos: { ubicacion: string; cantidad: number }[]
  inspectoresActivos: { inspector: string; cantidad: number }[]
  fabricantes: { fabricante: string; cantidad: number }[]
  conexionesTotales: number
}> {
  const connected = await isNeo4jConnected()
  const [clientes, gases, ubicaciones, inspectores, fabricantes, totalRelaciones] = await Promise.all([
    db.cylinder.groupBy({ by: ['cliente'], _count: { id: true }, where: { cliente: { not: null } }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    db.gas.findMany({ include: { _count: { select: { cylinders: true } } }, orderBy: { cylinders: { _count: 'desc' } }, take: 10 }),
    db.cylinder.groupBy({ by: ['ubicacionNombre', 'provincia'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    db.cylinder.groupBy({ by: ['inspectorId'], _count: { id: true }, where: { inspectorId: { not: null } }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    db.cylinder.groupBy({ by: ['fabricante'], _count: { id: true }, where: { fabricante: { not: null } }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    db.cylinder.count(),
  ])
  return {
    source: connected ? 'neo4j' : 'mock',
    clientesConMasTubos: clientes.filter((c) => c.cliente).map((c) => ({ cliente: c.cliente!, cantidad: c._count.id })),
    gasesMasUsados: gases.map((g) => ({ gas: g.nombre, cantidad: g._count.cylinders })),
    ubicacionesConMasTubos: ubicaciones.map((u) => ({ ubicacion: `${u.ubicacionNombre}${u.provincia ? `, ${u.provincia}` : ''}`, cantidad: u._count.id })),
    inspectoresActivos: inspectores.filter((i) => i.inspectorId).map((i) => ({ inspector: i.inspectorId!, cantidad: i._count.id })),
    fabricantes: fabricantes.filter((f) => f.fabricante).map((f) => ({ fabricante: f.fabricante!, cantidad: f._count.id })),
    conexionesTotales: totalRelaciones * 3,
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) { await driver.close(); driver = null }
}
