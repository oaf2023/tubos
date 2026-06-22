import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getGraphData, isNeo4jConnected } from '@/lib/neo4j'

// GET /api/graph - datos del grafo para visualización
// Parámetros: gasId, estado, cliente (filtros opcionales)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter: { gasId?: string; estado?: string; cliente?: string } = {}
    if (searchParams.get('gasId')) filter.gasId = searchParams.get('gasId')!
    if (searchParams.get('estado')) filter.estado = searchParams.get('estado')!
    if (searchParams.get('cliente')) filter.cliente = searchParams.get('cliente')!

    // Obtener todos los tubos con su gas (para construir el grafo si Neo4j no está)
    const cylinders = await db.cylinder.findMany({
      include: { gas: true },
      take: 500,
    })

    const graphData = await getGraphData({ cylinders }, filter)
    const connected = await isNeo4jConnected()

    return NextResponse.json({
      ...graphData,
      neo4jConnected: connected,
      totalNodes: graphData.nodes.length,
      totalEdges: graphData.edges.length,
    })
  } catch (e) {
    console.error('GET /api/graph', e)
    return NextResponse.json({ error: 'Error al obtener grafo' }, { status: 500 })
  }
}
