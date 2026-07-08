'use client'

import { useEffect, useState } from 'react'
import { Search, Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TubeOption {
  id: string
  numeroSerie: string
  gasId: string
  gas: { id: string; codigo: string; nombre: string; colorHex: string; presionBar: number }
  capacidadLitros: number
  presionActualBar: number
  estado: string
  ubicacionNombre: string
  cliente: string | null
}

interface TubeSelectorProps {
  onSelect: (tubes: TubeOption[]) => void
  selected?: TubeOption[]
  clientId?: string | null
  gasId?: string | null
  multiple?: boolean
}

export default function TubeSelector({ onSelect, selected = [], clientId, gasId, multiple = true }: TubeSelectorProps) {
  const [tubes, setTubes] = useState<TubeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(selected.map((t) => t.id)))

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('estado', 'LLENO')
        if (clientId) params.set('clienteId', clientId)
        if (gasId) params.set('gasId', gasId)
        params.set('limit', '200')
        const res = await fetch(`/api/cylinders?${params}`)
        if (res.ok) {
          const data = await res.json()
          setTubes(Array.isArray(data) ? data : [])
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [clientId, gasId])

  // Sync initial selected
  useEffect(() => {
    setSelectedIds(new Set(selected.map((t) => t.id)))
  }, [selected])

  function toggleTube(tube: TubeOption) {
    const next = new Set(selectedIds)
    if (next.has(tube.id)) {
      next.delete(tube.id)
    } else {
      if (!multiple) next.clear()
      next.add(tube.id)
    }
    setSelectedIds(next)
    onSelect(tubes.filter((t) => next.has(t.id)))
  }

  const filtered = tubes.filter((t) =>
    !search || t.numeroSerie.toLowerCase().includes(search.toLowerCase()) ||
    t.gas.codigo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          placeholder="Buscar por serie o gas..."
          className="pl-8 text-sm h-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-2 text-center">Cargando tubos disponibles...</div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-slate-400 py-2 text-center flex flex-col items-center gap-1">
          <Package className="w-4 h-4" />
          {search ? 'Sin resultados' : 'No hay tubos llenos disponibles'}
        </div>
      ) : (
        <div className="max-h-52 overflow-y-auto space-y-1 border rounded-lg p-1">
          {filtered.map((tube) => {
            const selected = selectedIds.has(tube.id)
            return (
              <label
                key={tube.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                  selected ? 'bg-orange-50 border border-orange-200' : ''
                }`}
              >
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name="tube-select"
                  className="accent-orange-500"
                  checked={selected}
                  onChange={() => toggleTube(tube)}
                />
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tube.gas.colorHex }} />
                <span className="font-mono font-medium flex-1">{tube.numeroSerie}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{tube.gas.codigo}</Badge>
                <span className="text-slate-400">{tube.capacidadLitros}L</span>
                <span className="text-slate-400">{tube.presionActualBar}bar</span>
              </label>
            )
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="text-xs text-slate-500">
          {selectedIds.size} tubo(s) seleccionado(s)
        </div>
      )}
    </div>
  )
}
