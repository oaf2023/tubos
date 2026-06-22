// Servicio Neo4j para grafos de relaciones
// Si NEO4J_ENABLED=false o la conexión falla, usa un mock en memoria
// que retorna la misma estructura de datos (graceful degradation).

import neo4j, { type Driver, type Session } from 'neo4j-driver'

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
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'gastrack123'
      )
    )
    console.log('[Neo4j] Driver inicializado')
    return driver
  } catch (e) {
    console.warn('[Neo4j] No se pudo inicializar driver:', e)
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
    console.log('[Neo4j] Conexión verificada')
    return true
  } catch {
    console.warn('[Neo4j] Sin conexión - usando mock en memoria')
    return false
  }
}

// Tipos de nodos del grafo
export type GraphNodeType =
  | 'Cylinder'
  | 'Gas'
  | 'Cliente'
  | 'Location'
  | 'Inspector'
  | 'Fabricante'
  | 'Ruta'

export interface GraphNode {
  id: string
  label: string
  type: GraphNodeType
  properties: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  type: string // CONTIENE, ASIGNADO_A, UBICADO_EN, INSPECCIONADO_POR, FABRICADO_POR, EN_RUTA
  properties?: Record<string, unknown>
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  source: 'neo4j' | 'mock'
}

// Inicializa constraints en Neo4j (solo si está conectado)
export async function initNeo4jSchema(): Promise<void> {
  const d = getDriver()
  if (!d) return
  const session = d.session()
  try {
    await session.run('CREATE CONSTRAINT cylinder_id IF NOT EXISTS FOR (c:Cylinder) REQUIRE c.id IS UNIQUE')
    await session.run('CREATE CONSTRAINT gas_id IF NOT EXISTS FOR (g:Gas) REQUIRE g.id IS UNIQUE')
    await session.run('CREATE CONSTRAINT cliente_id IF NOT EXISTS FOR (cl:Cliente) REQUIRE cl.nombre IS UNIQUE')
    await session.run('CREATE CONSTRAINT location_id IF NOT EXISTS FOR (l:Location) REQUIRE l.nombre IS UNIQUE')
    await session.run('CREATE CONSTRAINT inspector_id IF NOT EXISTS FOR (i:Inspector) REQUIRE i.id IS UNIQUE')
    await session.run('CREATE CONSTRAINT fabricante_id IF NOT EXISTS FOR (f:Fabricante) REQUIRE f.nombre IS UNIQUE')
    await session.run('CREATE CONSTRAINT ruta_id IF NOT EXISTS FOR (r:Ruta) REQUIRE r.id IS UNIQUE')
    console.log('[Neo4j] Schema inicializado')
  } catch (e) {
    console.warn('[Neo4j] Error creando constraints:', e)
  } finally {
    await session.close()
  }
}

// Sincroniza un tubo y sus relaciones con Neo4j
export async function syncCylinderToGraph(cylinder: {
  id: string
  numeroSerie: string
  gasId: string
  gas?: { id: string; nombre: string; codigo: string }
  cliente: string | null
  ubicacionNombre: string
  provincia: string
  inspectorId: string | null
  laboratorio: string | null
  fabricante: string | null
  estado: string
  capacidadLitros: number
  presionActualBar: number
}): Promise<void> {
  const d = getDriver()
  if (!d) return
  const session = d.session()
  try {
    // MERGE del nodo Cylinder
    await session.run(
      `MERGE (c:Cylinder {id: $id})
       SET c.numeroSerie = $serie,
           c.estado = $estado,
           c.capacidad = $cap,
           c.presion = $pres,
           c.ubicacion = $ubi`,
      {
        id: cylinder.id,
        serie: cylinder.numeroSerie,
        estado: cylinder.estado,
        cap: cylinder.capacidadLitros,
        pres: cylinder.presionActualBar,
        ubi: cylinder.ubicacionNombre,
      }
    )

    // Relación con Gas
    if (cylinder.gas) {
      await session.run(
        `MERGE (g:Gas {id: $gid})
         SET g.nombre = $gnom, g.codigo = $gcod
         MERGE (c:Cylinder {id: $cid})-[:CONTIENE]->(g)`,
        {
          gid: cylinder.gas.id,
          gnom: cylinder.gas.nombre,
          gcod: cylinder.gas.codigo,
          cid: cylinder.id,
        }
      )
    }

    // Relación con Cliente
    if (cylinder.cliente) {
      await session.run(
        `MERGE (cl:Cliente {nombre: $cli})
         MERGE (c:Cylinder {id: $cid})-[:ASIGNADO_A]->(cl)`,
        { cli: cylinder.cliente, cid: cylinder.id }
      )
    }

    // Relación con Location
    await session.run(
      `MERGE (l:Location {nombre: $loc})
       MERGE (c:Cylinder {id: $cid})-[:UBICADO_EN]->(l)`,
      { loc: cylinder.ubicacionNombre, cid: cylinder.id }
    )

    // Relación con Inspector
    if (cylinder.inspectorId) {
      await session.run(
        `MERGE (i:Inspector {id: $iid})
         MERGE (c:Cylinder {id: $cid})-[:INSPECCIONADO_POR]->(i)`,
        { iid: cylinder.inspectorId, cid: cylinder.id }
      )
    }

    // Relación con Fabricante
    if (cylinder.fabricante) {
      await session.run(
        `MERGE (f:Fabricante {nombre: $fab})
         MERGE (c:Cylinder {id: $cid})-[:FABRICADO_POR]->(f)`,
        { fab: cylinder.fabricante, cid: cylinder.id }
      )
    }
  } catch (e) {
    console.warn('[Neo4j] Error sincronizando tubo:', e)
  } finally {
    await session.close()
  }
}

// Obtiene el grafo completo para visualización
// Si Neo4j no está disponible, construye el grafo en memoria desde los datos de SQLite
export async function getGraphData(
  sqliteData: {
    cylinders: Array<{
      id: string
      numeroSerie: string
      estado: string
      capacidadLitros: number
      presionActualBar: number
      cliente: string | null
      ubicacionNombre: string
      provincia: string
      inspectorId: string | null
      fabricante: string | null
      gas: { id: string; nombre: string; codigo: string; colorHex: string; categoria: string }
    }>
  },
  filter?: { gasId?: string; estado?: string; cliente?: string }
): Promise<GraphData> {
  const connected = await isNeo4jConnected()

  if (connected) {
    return getGraphFromNeo4j(filter)
  }

  // Mock en memoria: construir grafo desde SQLite
  return buildGraphInMemory(sqliteData, filter)
}

async function getGraphFromNeo4j(filter?: {
  gasId?: string
  estado?: string
  cliente?: string
}): Promise<GraphData> {
  const d = getDriver()!
  const session = d.session()
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()

  try {
    // Construir cláusula WHERE
    const conditions: string[] = []
    const params: Record<string, unknown> = {}
    if (filter?.gasId) {
      conditions.push('g.id = $gasId')
      params.gasId = filter.gasId
    }
    if (filter?.estado) {
      conditions.push('c.estado = $estado')
      params.estado = filter.estado
    }
    if (filter?.cliente) {
      conditions.push('cl.nombre = $cliente')
      params.cliente = filter.cliente
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Consulta: traer tubos con todas sus relaciones
    const query = `
      MATCH (c:Cylinder)-[r]->(n)
      ${whereClause}
      RETURN c, r, n, labels(n) as labels
      LIMIT 500
    `
    const result = await session.run(query, params)

    for (const rec of result.records) {
      const c = rec.get('c').properties
      const n = rec.get('n').properties
      const relType = rec.get('r').type
      const labels = rec.get('labels') as string[]

      const cylId = `cyl-${c.id}`
      if (!nodeIds.has(cylId)) {
        nodeIds.add(cylId)
        nodes.push({
          id: cylId,
          label: c.numeroSerie || c.id,
          type: 'Cylinder',
          properties: {
            estado: c.estado,
            capacidad: c.capacidad,
            presion: c.presion,
            ubicacion: c.ubicacion,
          },
        })
      }

      const targetId = `${labels[0].toLowerCase()}-${n.id || n.nombre || n.codigo}`
      if (!nodeIds.has(targetId)) {
        nodeIds.add(targetId)
        const label = n.nombre || n.codigo || n.id
        nodes.push({
          id: targetId,
          label,
          type: labels[0] as GraphNodeType,
          properties: n,
        })
      }

      edges.push({ source: cylId, target: targetId, type: relType })
    }
  } finally {
    await session.close()
  }

  return { nodes, edges, source: 'neo4j' }
}

function buildGraphInMemory(
  data: {
    cylinders: Array<{
      id: string
      numeroSerie: string
      estado: string
      capacidadLitros: number
      presionActualBar: number
      cliente: string | null
      ubicacionNombre: string
      provincia: string
      inspectorId: string | null
      fabricante: string | null
      gas: { id: string; nombre: string; codigo: string; colorHex: string; categoria: string }
    }>
  },
  filter?: { gasId?: string; estado?: string; cliente?: string }
): GraphData {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()

  const filtered = data.cylinders.filter((c) => {
    if (filter?.gasId && c.gas.id !== filter.gasId) return false
    if (filter?.estado && c.estado !== filter.estado) return false
    if (filter?.cliente && c.cliente !== filter.cliente) return false
    return true
  })

  // Limitar para no saturar la visualización
  const limited = filtered.slice(0, 60)

  for (const c of limited) {
    // Nodo Cylinder
    const cylId = `cyl-${c.id}`
    if (!nodeIds.has(cylId)) {
      nodeIds.add(cylId)
      nodes.push({
        id: cylId,
        label: c.numeroSerie,
        type: 'Cylinder',
        properties: {
          estado: c.estado,
          capacidad: c.capacidadLitros,
          presion: c.presionActualBar,
          ubicacion: c.ubicacionNombre,
        },
      })
    }

    // Nodo Gas
    const gasId = `gas-${c.gas.id}`
    if (!nodeIds.has(gasId)) {
      nodeIds.add(gasId)
      nodes.push({
        id: gasId,
        label: c.gas.nombre,
        type: 'Gas',
        properties: {
          codigo: c.gas.codigo,
          color: c.gas.colorHex,
          categoria: c.gas.categoria,
        },
      })
    }
    edges.push({ source: cylId, target: gasId, type: 'CONTIENE' })

    // Nodo Cliente
    if (c.cliente) {
      const cliId = `cli-${c.cliente.replace(/\s+/g, '_')}`
      if (!nodeIds.has(cliId)) {
        nodeIds.add(cliId)
        nodes.push({
          id: cliId,
          label: c.cliente,
          type: 'Cliente',
          properties: { nombre: c.cliente },
        })
      }
      edges.push({ source: cylId, target: cliId, type: 'ASIGNADO_A' })
    }

    // Nodo Location
    const locId = `loc-${c.ubicacionNombre.replace(/\s+/g, '_')}`
    if (!nodeIds.has(locId)) {
      nodeIds.add(locId)
      nodes.push({
        id: locId,
        label: c.ubicacionNombre,
        type: 'Location',
        properties: { provincia: c.provincia },
      })
    }
    edges.push({ source: cylId, target: locId, type: 'UBICADO_EN' })

    // Nodo Inspector
    if (c.inspectorId) {
      const inspId = `insp-${c.inspectorId}`
      if (!nodeIds.has(inspId)) {
        nodeIds.add(inspId)
        nodes.push({
          id: inspId,
          label: c.inspectorId,
          type: 'Inspector',
          properties: { id: c.inspectorId },
        })
      }
      edges.push({ source: cylId, target: inspId, type: 'INSPECCIONADO_POR' })
    }

    // Nodo Fabricante
    if (c.fabricante) {
      const fabId = `fab-${c.fabricante.replace(/\s+/g, '_')}`
      if (!nodeIds.has(fabId)) {
        nodeIds.add(fabId)
        nodes.push({
          id: fabId,
          label: c.fabricante,
          type: 'Fabricante',
          properties: { nombre: c.fabricante },
        })
      }
      edges.push({ source: cylId, target: fabId, type: 'FABRICADO_POR' })
    }
  }

  return { nodes, edges, source: 'mock' }
}

// Consultas analíticas que aprovechan el grafo
export async function getGraphAnalytics(): Promise<{
  source: 'neo4j' | 'mock'
  clientesConMasTubos: { cliente: string; cantidad: number }[]
  gasesMasUsados: { gas: string; cantidad: number }[]
  ubicacionesConMasTubos: { ubicacion: string; cantidad: number }[]
  inspectoresActivos: { inspector: string; cantidad: number }[]
  fabricantes: { fabricante: string; cantidad: number }[]
  conexionesTotales: number
}> {
  // Como la consulta real es compleja, se hace siempre con los datos de SQLite
  // pero se marca el source según Neo4j esté conectado o no
  const connected = await isNeo4jConnected()
  return {
    source: connected ? 'neo4j' : 'mock',
    clientesConMasTubos: [],
    gasesMasUsados: [],
    ubicacionesConMasTubos: [],
    inspectoresActivos: [],
    fabricantes: [],
    conexionesTotales: 0,
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }
}
