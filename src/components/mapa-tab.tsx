'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { Cylinder, MapMarker } from '@/lib/tab-types'
import { ESTADOS } from '@/lib/catalogo'

const ESTADO_LABELS: Record<string, string> = {
  LLENO: 'Lleno',
  EN_USO: 'En uso',
  VACIO: 'Vacío',
  MANTENIMIENTO: 'Mantenimiento',
  TRANSITO: 'En tránsito',
}

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
      <div className="text-slate-500 flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
        <span className="text-sm">Cargando mapa...</span>
      </div>
    </div>
  ),
})

export default function MapaTab() {
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroGas, setFiltroGas] = useState<string>('all')
  const [filtroEstado, setFiltroEstado] = useState<string>('all')

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtroGas !== 'all') params.set('gasId', filtroGas)
      if (filtroEstado !== 'all') params.set('estado', filtroEstado)
      const res = await fetch(`/api/cylinders?${params}`)
      const data = await res.json()
      setCylinders(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [filtroGas, filtroEstado])

  useEffect(() => {
    void load()
  }, [load])

  const markers = useMemo(() => {
    const grupos = new Map<
      string,
      { lat: number; lng: number; nombre: string; provincia: string; tubos: Cylinder[] }
    >()

    cylinders.forEach((c) => {
      const key = `${c.ubicacionLat.toFixed(2)}_${c.ubicacionLng.toFixed(2)}`
      if (!grupos.has(key)) {
        grupos.set(key, {
          lat: c.ubicacionLat,
          lng: c.ubicacionLng,
          nombre: c.ubicacionNombre,
          provincia: c.provincia,
          tubos: [],
        })
      }
      grupos.get(key)!.tubos.push(c)
    })

    return Array.from(grupos.values()).map((g, idx) => {
      const esBase = g.nombre === 'San Nicolás de los Arroyos'
      const gasPrincipal = g.tubos[0].gas
      return {
        id: `g-${idx}`,
        lat: g.lat,
        lng: g.lng,
        color: esBase ? '#dc2626' : gasPrincipal.colorHex,
        label: g.nombre,
        count: g.tubos.length,
        isBase: esBase,
        popup: `
          <div style="margin-top:2px;">
            <strong>${g.tubos.length} tubo(s)</strong><br/>
            <span style="color:#64748b;">${g.provincia}</span><br/>
            <span style="display:inline-block;margin-top:4px;font-size:11px;">
              ${[...new Set(g.tubos.map((t) => t.gas.nombre))].slice(0, 3).join(' · ')}
            </span>
          </div>
        `,
      } satisfies MapMarker
    })
  }, [cylinders])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Filtrar por gas</Label>
              <Select value={filtroGas} onValueChange={setFiltroGas}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los gases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los gases</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">Filtrar por estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ESTADO_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 ml-auto">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow" />
                Base
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
                Tubo
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-[600px] rounded-xl" />
      ) : (
        <MapView markers={markers} height="600px" />
      )}

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-slate-600">
            <strong className="text-slate-800">{cylinders.length} tubos</strong> mostrados
            en el mapa. Los marcadores se agrupan por ubicación. El número sobre cada
            marcador indica la cantidad de tubos en ese punto. La base operativa
            (San Nicolás de los Arroyos) se muestra en rojo y corresponde a la planta
            central de distribución.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
