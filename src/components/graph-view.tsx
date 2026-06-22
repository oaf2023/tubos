'use client'

import { useEffect, useRef, useState, useMemo } from 'react'

export interface GraphNode {
  id: string
  label: string
  type: string
  properties: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  type: string
}

interface GraphViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  height?: string
  onNodeClick?: (node: GraphNode) => void
}

// Colores por tipo de nodo
const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  Cylinder: { fill: '#fb923c', stroke: '#c2410c', text: '#7c2d12' },
  Gas: { fill: '#34d399', stroke: '#047857', text: '#064e3b' },
  Cliente: { fill: '#60a5fa', stroke: '#1d4ed8', text: '#1e3a8a' },
  Location: { fill: '#fbbf24', stroke: '#b45309', text: '#78350f' },
  Inspector: { fill: '#a78bfa', stroke: '#6d28d9', text: '#4c1d95' },
  Fabricante: { fill: '#f472b6', stroke: '#be185d', text: '#831843' },
  Ruta: { fill: '#22d3ee', stroke: '#0e7490', text: '#155e75' },
}

const NODE_SIZES: Record<string, number> = {
  Cylinder: 22,
  Gas: 30,
  Cliente: 26,
  Location: 24,
  Inspector: 20,
  Fabricante: 22,
  Ruta: 28,
}

const EDGE_COLORS: Record<string, string> = {
  CONTIENE: '#10b981',
  ASIGNADO_A: '#3b82f6',
  UBICADO_EN: '#f59e0b',
  INSPECCIONADO_POR: '#8b5cf6',
  FABRICADO_POR: '#ec4899',
  EN_RUTA: '#06b6d4',
}

interface PositionedNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
}

export default function GraphView({
  nodes,
  edges,
  height = '600px',
  onNodeClick,
}: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [positions, setPositions] = useState<Map<string, PositionedNode>>(new Map())
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)
  const iterationRef = useRef(0)

  // Medir contenedor
  useEffect(() => {
    if (!svgRef.current) return
    const observer = new ResizeObserver((entries) => {
      const e = entries[0]
      setDimensions({
        width: e.contentRect.width,
        height: e.contentRect.height,
      })
    })
    observer.observe(svgRef.current)
    return () => observer.disconnect()
  }, [])

  // Inicializar posiciones aleatorias cuando cambian los nodos
  useEffect(() => {
    if (nodes.length === 0) return
    const map = new Map<string, PositionedNode>()
    const cx = dimensions.width / 2
    const cy = dimensions.height / 2
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35

    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI
      map.set(n.id, {
        ...n,
        x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 30,
        y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0,
      })
    })
    setPositions(map)
    iterationRef.current = 0
  }, [nodes, dimensions])

  // Simulación de fuerza (force-directed layout)
  useEffect(() => {
    if (positions.size === 0) return

    const simulate = () => {
      const next = new Map(positions)
      const cx = dimensions.width / 2
      const cy = dimensions.height / 2
      const maxIter = 300

      if (iterationRef.current >= maxIter) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current)
        return
      }
      iterationRef.current++

      // Repulsión entre nodos
      const nodeArr = Array.from(next.values())
      for (let i = 0; i < nodeArr.length; i++) {
        for (let j = i + 1; j < nodeArr.length; j++) {
          const a = nodeArr[i]
          const b = nodeArr[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
          const force = 2500 / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          a.vx += fx
          a.vy += fy
          b.vx -= fx
          b.vy -= fy
        }
      }

      // Atracción de las aristas
      for (const edge of edges) {
        const a = next.get(edge.source)
        const b = next.get(edge.target)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
        const targetDist = 80
        const force = (dist - targetDist) * 0.04
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }

      // Atracción al centro
      for (const n of next.values()) {
        n.vx += (cx - n.x) * 0.005
        n.vy += (cy - n.y) * 0.005
      }

      // Aplicar velocidades con amortiguación
      const damping = 0.85
      for (const n of next.values()) {
        n.vx *= damping
        n.vy *= damping
        n.x += n.vx
        n.y += n.vy
        // Limitar a los bordes con margen
        const margin = 40
        n.x = Math.max(margin, Math.min(dimensions.width - margin, n.x))
        n.y = Math.max(margin, Math.min(dimensions.height - margin, n.y))
      }

      setPositions(new Map(next))
      animationRef.current = requestAnimationFrame(simulate)
    }

    animationRef.current = requestAnimationFrame(simulate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [positions.size, edges, dimensions])

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node)
    onNodeClick?.(node)
  }

  // Vecinos del nodo seleccionado o hovered
  const activeNode = hoveredNode || selectedNode?.id
  const neighbors = useMemo(() => {
    if (!activeNode) return null
    const set = new Set<string>([activeNode])
    for (const e of edges) {
      if (e.source === activeNode) set.add(e.target)
      if (e.target === activeNode) set.add(e.source)
    }
    return set
  }, [activeNode, edges])

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200"
      >
        {/* Defs: marcadores de flecha */}
        <defs>
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity="0.7" />
            </marker>
          ))}
        </defs>

        {/* Aristas */}
        <g>
          {edges.map((edge, i) => {
            const a = positions.get(edge.source)
            const b = positions.get(edge.target)
            if (!a || !b) return null
            const color = EDGE_COLORS[edge.type] || '#94a3b8'
            const isActive = neighbors
              ? neighbors.has(edge.source) && neighbors.has(edge.target)
              : true
            return (
              <line
                key={`${edge.source}-${edge.target}-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={color}
                strokeWidth={isActive ? 2 : 0.5}
                strokeOpacity={isActive ? 0.8 : 0.2}
                markerEnd={`url(#arrow-${edge.type})`}
              />
            )
          })}
        </g>

        {/* Nodos */}
        <g>
          {Array.from(positions.values()).map((n) => {
            const cfg = NODE_COLORS[n.type] || NODE_COLORS.Cylinder
            const size = NODE_SIZES[n.type] || 22
            const isNeighbor = neighbors ? neighbors.has(n.id) : true
            const isHovered = hoveredNode === n.id
            const isSelected = selectedNode?.id === n.id
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onClick={() => handleNodeClick(n)}
                onMouseEnter={() => setHoveredNode(n.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
                opacity={isNeighbor ? 1 : 0.25}
              >
                {/* Halo para hovered/selected */}
                {(isHovered || isSelected) && (
                  <circle
                    r={size + 6}
                    fill="none"
                    stroke={cfg.stroke}
                    strokeWidth="2"
                    strokeOpacity="0.4"
                  />
                )}
                <circle
                  r={size}
                  fill={cfg.fill}
                  stroke={cfg.stroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={size > 24 ? 10 : 9}
                  fontWeight="700"
                  fill={cfg.text}
                  pointerEvents="none"
                  style={{ userSelect: 'none' }}
                >
                  {n.label.length > 12 ? n.label.slice(0, 10) + '…' : n.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Panel lateral: detalle del nodo seleccionado */}
      {selectedNode && (
        <div className="absolute top-3 right-3 w-64 bg-white rounded-lg border border-slate-200 shadow-lg p-3 text-xs">
          <div className="flex items-start justify-between mb-2">
            <div
              className="px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase"
              style={{ background: NODE_COLORS[selectedNode.type]?.fill || '#94a3b8' }}
            >
              {selectedNode.type}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-700 text-base leading-none"
            >
              ×
            </button>
          </div>
          <div className="font-bold text-slate-800 text-sm mb-2 break-words">
            {selectedNode.label}
          </div>
          <div className="space-y-1">
            {Object.entries(selectedNode.properties).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-slate-500 capitalize">{k}:</span>
                <span className="font-medium text-slate-700 text-right break-all">
                  {String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 bg-white/95 rounded-lg border border-slate-200 shadow p-2 flex flex-wrap gap-2 max-w-[80%]">
        {Object.entries(NODE_COLORS).map(([type, cfg]) => {
          const count = nodes.filter((n) => n.type === type).length
          if (count === 0) return null
          return (
            <div key={type} className="flex items-center gap-1 text-[10px]">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: cfg.fill }}
              />
              <span className="text-slate-700 font-medium">{type}</span>
              <span className="text-slate-400">({count})</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
