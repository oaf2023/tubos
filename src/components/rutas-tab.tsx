'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Map as MapIcon,
  Route as RouteIcon,
  Plus,
  Trash2,
  MapPin,
  Truck,
  X,
  RefreshCw,
  DollarSign,
  Navigation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { Ruta, RutaParada, Location, MapMarker } from '@/lib/tab-types'
import type { GeocercaData } from '@/components/map-view'
import { formatDate } from '@/lib/tab-constants'

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
      <div className="text-slate-500 flex flex-col items-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="text-sm">Cargando mapa...</span>
      </div>
    </div>
  ),
})

type VehiculoData = {
  id: string
  codigo: string
  patente: string
  marca: string
  modelo: string
  tipo: string
  maxTubos: number | null
  orientacionTubos: string
  largoCajaCm: number | null
  anchoCajaCm: number | null
  altoCajaCm: number | null
  costoPorKm: number | null
  estado: string
}

export default function RutasTab() {
  const { toast } = useToast()
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [vehiculos, setVehiculos] = useState<VehiculoData[]>([])
  const [geocercas, setGeocercas] = useState<GeocercaData[]>([])
  const [loading, setLoading] = useState(true)

  // Nueva ruta
  const [nombreRuta, setNombreRuta] = useState('')
  const [selectedParadas, setSelectedParadas] = useState<Location[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [costoPorKm, setCostoPorKm] = useState('')
  const [optimizando, setOptimizando] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  // Distancia optimizada (OSRM)
  const [optDistance, setOptDistance] = useState<{ km: number; horas: number } | null>(null)

  // Geometría de ruta optimizada (OSRM)
  const [routeGeometry, setRouteGeometry] = useState<[number, number][] | null>(null)

  // Navegación
  const [navegando, setNavegando] = useState<Ruta | null>(null)
  const [currentStopIdx, setCurrentStopIdx] = useState(0)

  // GPS simulated pings
  const [gpsPings, setGpsPings] = useState<any[]>([])
  const [gpsSimulando, setGpsSimulando] = useState(false)
  const [gpsInterval, setGpsInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const [rRes, lRes, vRes, gRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/locations'),
        fetch('/api/vehiculos'),
        fetch('/api/geocercas'),
      ])
      const [rData, lData, vData, gData] = await Promise.all([
        rRes.json(), lRes.json(), vRes.json(), gRes.json(),
      ])
      setRutas(Array.isArray(rData) ? rData : [])
      setLocations(Array.isArray(lData) ? lData : [])
      setVehiculos(Array.isArray(vData) ? vData : [])
      setGeocercas(Array.isArray(gData) ? gData : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const base = locations.find((l) => l.esBase)

  function toggleParada(loc: Location) {
    setSelectedParadas((prev) => {
      const exists = prev.find((p) => p.id === loc.id)
      if (exists) return prev.filter((p) => p.id !== loc.id)
      return [...prev, loc]
    })
  }

  function moveParada(idx: number, direction: -1 | 1) {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= selectedParadas.length) return
    const arr = [...selectedParadas]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setSelectedParadas(arr)
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const arr = [...selectedParadas]
    ;[arr[dragIdx], arr[idx]] = [arr[idx], arr[dragIdx]]
    setSelectedParadas(arr)
    setDragIdx(idx)
  }

  async function optimizarRuta() {
    if (selectedParadas.length < 2) {
      toast({ title: 'Seleccioná al menos 2 paradas', variant: 'destructive' })
      return
    }
    if (!base) {
      toast({ title: 'Error', description: 'No se encontró la base', variant: 'destructive' })
      return
    }
    setOptimizando(true)
    try {
      const res = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: { lat: base.lat, lng: base.lng },
          points: selectedParadas.map((p) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            nombre: p.nombre,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const reordered = data.optimized
        .map((o: any) => selectedParadas.find((p) => p.id === o.id))
        .filter(Boolean) as Location[]
      setSelectedParadas(reordered)
      if (data.geometry) {
        setRouteGeometry(data.geometry)
      }
      setOptDistance({ km: data.distanceTotal, horas: Math.round(data.durationMin / 60 * 10) / 10 })
      const modo = data.usaLiveMatrix ? 'OSRM' : 'Haversine'
      toast({
        title: `Ruta optimizada (${modo})`,
        description: `${data.distanceTotal} km totales, ~${data.durationMin} min`,
      })
    } catch {
      toast({ title: 'Error al optimizar', variant: 'destructive' })
    }
    setOptimizando(false)
  }

  async function crearRuta() {
    if (!base) {
      toast({ title: 'Error', description: 'No se encontró la base', variant: 'destructive' })
      return
    }
    if (!nombreRuta.trim()) {
      toast({ title: 'Faltan datos', description: 'Ingrese nombre de ruta', variant: 'destructive' })
      return
    }
    if (selectedParadas.length === 0) {
      toast({ title: 'Faltan paradas', description: 'Seleccione al menos una parada', variant: 'destructive' })
      return
    }

    const body: any = {
      nombre: nombreRuta,
      origenNombre: base.nombre,
      origenLat: base.lat,
      origenLng: base.lng,
      vehicleId: selectedVehicleId || undefined,
      costoPorKm: costoPorKm ? Number(costoPorKm) : undefined,
      paradas: selectedParadas.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        nombre: p.nombre,
        provincia: p.provincia,
        cylinderIds: '',
        notas: '',
      })),
    }

    if (optDistance) {
      body.distanciaReal = optDistance.km
      body.duracionReal = optDistance.horas
    }

    if (routeGeometry && routeGeometry.length >= 2) {
      body.geometry = JSON.stringify(routeGeometry)
    }

    const res = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      toast({ title: 'Error al crear ruta', variant: 'destructive' })
      return
    }

    toast({ title: 'Ruta creada', description: `${nombreRuta} con ${selectedParadas.length} paradas` })
    setNombreRuta('')
    setSelectedParadas([])
    setSelectedVehicleId('')
    setCostoPorKm('')
    setOptDistance(null)
    setRouteGeometry(null)
    load()
  }

  async function eliminarRuta(id: string) {
    if (!confirm('¿Eliminar esta ruta?')) return
    await fetch(`/api/routes/${id}`, { method: 'DELETE' })
    toast({ title: 'Ruta eliminada' })
    load()
  }

  async function cambiarEstado(ruta: Ruta, estado: string) {
    await fetch(`/api/routes/${ruta.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    toast({ title: `Ruta marcada como ${estado.replace('_', ' ')}` })
    load()
  }

  async function marcarEntregado(paradaId: string) {
    const r = navegando
    if (!r) return
    await fetch(`/api/routes/${r.id}/paradas/${paradaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'ENTREGADO', llegada: true }),
    })
    setCurrentStopIdx((prev) => Math.min(prev + 1, r.paradas.length))
    load()
  }

  function iniciarNavegacion(r: Ruta) {
    setNavegando(r)
    setCurrentStopIdx(r.paradas.findIndex((p) => p.estado !== 'ENTREGADO'))
    if (currentStopIdx < 0) setCurrentStopIdx(0)
  }

  // Simular GPS durante navegación
  useEffect(() => {
    if (navegando && gpsSimulando) {
      const interval = setInterval(async () => {
        const r = navegando
        const nextParada = r.paradas.find(p => p.estado !== 'ENTREGADO') || r.paradas[r.paradas.length - 1]
        // Simular movimiento hacia la parada
        const ultimo = gpsPings[0]
        const lat = ultimo ? ultimo.lat + (Math.random() - 0.5) * 0.01 : r.origenLat
        const lng = ultimo ? ultimo.lng + (Math.random() - 0.5) * 0.01 : r.origenLng

        const res = await fetch('/api/gps/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rutaId: r.id,
            lat: parseFloat(lat.toFixed(6)),
            lng: parseFloat(lng.toFixed(6)),
            velocidad: Math.round(20 + Math.random() * 40),
            rumbo: Math.round(Math.random() * 360),
            precision: Math.round(3 + Math.random() * 7),
            fuente: 'SIMULADO',
          }),
        })
        if (res.ok) {
          const newPing = await res.json()
          setGpsPings(prev => [newPing, ...prev].slice(0, 50))
        }
      }, 3000)
      setGpsInterval(interval)
      return () => clearInterval(interval)
    }
    if (!gpsSimulando && gpsInterval) {
      clearInterval(gpsInterval)
      setGpsInterval(null)
    }
  }, [navegando, gpsSimulando])

  async function toggleGpsSimulacion() {
    if (gpsSimulando) {
      setGpsSimulando(false)
      return
    }
    if (!navegando) return
    setGpsPings([])
    setGpsSimulando(true)
    toast({ title: 'GPS', description: 'Simulación de ubicación iniciada' })
  }

  // Cargar pings reales al abrir navegación
  useEffect(() => {
    if (navegando) {
      fetch(`/api/gps/ping?rutaId=${navegando.id}`)
        .then(r => r.json())
        .then(data => setGpsPings(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }, [navegando])

  // Mapa de la ruta seleccionada
  const [rutaSeleccionada, setRutaSeleccionada] = useState<Ruta | null>(null)
  const rutaMarkers = useMemo(() => {
    const markers: MapMarker[] = []

    if (base && selectedParadas.length > 0) {
      markers.push({
        id: 'base-planning',
        lat: base.lat,
        lng: base.lng,
        color: '#dc2626',
        label: base.nombre,
        isBase: true,
        popup: `<strong>Base Operativa</strong><br/>${base.nombre}`,
      })
      selectedParadas.forEach((p) => {
        markers.push({
          id: `planning-${p.id}`,
          lat: p.lat,
          lng: p.lng,
          color: '#3b82f6',
          label: p.nombre,
          popup: p.nombre,
        })
      })
    }

    if (rutaSeleccionada && base) {
      const delivered = rutaSeleccionada.paradas.filter((p) => p.estado === 'ENTREGADO').length
      markers.push({
        id: 'base-saved',
        lat: base.lat,
        lng: base.lng,
        color: '#dc2626',
        label: base.nombre,
        isBase: true,
        popup: `<strong>Base Operativa</strong><br/>${base.nombre}<br/><span style="font-size:11px;color:#64748b;">${delivered}/${rutaSeleccionada.paradas.length} entregados</span>`,
      })
    }

    // GPS pings como marcadores de tracking
    if (gpsPings.length > 0 && navegando) {
      gpsPings.slice(0, 20).forEach((p, idx) => {
        markers.push({
          id: `gps-${p.id}`,
          lat: p.lat,
          lng: p.lng,
          color: idx === 0 ? '#f97316' : '#94a3b8',
          label: idx === 0 ? 'Ubicación actual' : `Ping ${idx + 1}`,
          popup: `<strong>${idx === 0 ? 'Ubicación Actual' : 'Ping Anterior'}</strong><br/>Lat: ${p.lat}<br/>Lng: ${p.lng}<br/>Vel: ${p.velocidad || '?'} km/h<br/>${new Date(p.createdAt).toLocaleTimeString('es-AR')}`,
        })
      })
    }

    return markers
  }, [rutaSeleccionada, base, selectedParadas, gpsPings, navegando])

  const rutaRoutes = useMemo(() => {
    const routes: any[] = []

    if (base && selectedParadas.length > 0) {
      const planningPoints = [
        { lat: base.lat, lng: base.lng, nombre: base.nombre },
        ...selectedParadas.map((p) => ({ lat: p.lat, lng: p.lng, nombre: p.nombre })),
      ]

      routes.push({
        id: 'planning',
        color: '#3b82f6',
        nombre: 'Planificación',
        distanciaKm: optDistance?.km,
        points: planningPoints,
        geometry: routeGeometry || undefined,
      })
    }

    if (rutaSeleccionada && base) {
      let savedGeometry: [number, number][] | undefined
      if (rutaSeleccionada.geometry) {
        try {
          const parsed = JSON.parse(rutaSeleccionada.geometry)
          if (Array.isArray(parsed) && parsed.length >= 2) {
            savedGeometry = parsed
          }
        } catch { /* ignore */ }
      }
      routes.push({
        id: rutaSeleccionada.id,
        color: '#f97316',
        nombre: rutaSeleccionada.nombre,
        distanciaKm: rutaSeleccionada.distanciaKm,
        geometry: savedGeometry,
        points: [
          { lat: base.lat, lng: base.lng, nombre: base.nombre },
          ...rutaSeleccionada.paradas.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            nombre: p.nombre,
          })),
          { lat: base.lat, lng: base.lng, nombre: `Retorno a ${base.nombre}` },
        ],
      })
    }

    return routes
  }, [rutaSeleccionada, base, selectedParadas, optDistance, routeGeometry])

  // Capacidad del vehículo seleccionado
  const capacidadInfo = useMemo(() => {
    if (!selectedVehicleId) return null
    const v = vehiculos.find(v => v.id === selectedVehicleId)
    if (!v) return null
    return {
      maxTubos: v.maxTubos,
      patente: v.patente,
      costoPorKm: v.costoPorKm,
      tipo: v.tipo,
    }
  }, [selectedVehicleId, vehiculos])

  // Costo total estimado
  const costoTotalEstimado = useMemo(() => {
    const km = optDistance?.km || 0
    const costo = Number(costoPorKm) || capacidadInfo?.costoPorKm || 0
    return km > 0 && costo > 0 ? (km * costo).toFixed(2) : null
  }, [optDistance, costoPorKm, capacidadInfo])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planificador */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-orange-500" />
              Planificar Nueva Ruta
            </CardTitle>
            <CardDescription>
              Origen: San Nicolás de los Arroyos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Nombre de la ruta</Label>
              <Input
                placeholder="Ej: Ruta Litoral - Martes"
                value={nombreRuta}
                onChange={(e) => setNombreRuta(e.target.value)}
              />
            </div>

            {/* Vehículo asignado */}
            <div>
              <Label className="text-xs">Vehículo asignado</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Sin vehículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.patente} — {v.marca} {v.modelo} ({v.tipo})
                      {v.maxTubos ? ` · ${v.maxTubos} tubos` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info de capacidad (vehículo seleccionado) */}
            {capacidadInfo && (
              <div className="bg-sky-50 border border-sky-200 rounded p-2 text-[10px] space-y-0.5">
                <div className="font-medium text-sky-800">{capacidadInfo.patente} ({capacidadInfo.tipo})</div>
                <div className="flex justify-between">
                  <span>Capacidad</span>
                  <span className="font-mono">{capacidadInfo.maxTubos ?? 'N/A'} tubos</span>
                </div>
                {capacidadInfo.costoPorKm && (
                  <div className="flex justify-between">
                    <span>Costo/km</span>
                    <span className="font-mono">${capacidadInfo.costoPorKm}</span>
                  </div>
                )}
              </div>
            )}

            {/* Costo por km manual */}
            <div>
              <Label className="text-xs">Costo por km ($)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input
                    type="number" step="1" min="0"
                    placeholder={capacidadInfo?.costoPorKm ? `Default: $${capacidadInfo.costoPorKm}` : 'Ej: 450'}
                    value={costoPorKm}
                    onChange={(e) => setCostoPorKm(e.target.value)}
                    className="pl-7 h-9 text-xs"
                  />
                </div>
              </div>
              {costoTotalEstimado && (
                <p className="text-[10px] text-emerald-600 mt-1">
                  Costo estimado: <strong>${costoTotalEstimado}</strong> ({optDistance?.km} km)
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">Ubicaciones disponibles</Label>
              <ScrollArea className="h-[160px] border border-slate-200 rounded-md">
                <div className="p-1.5 space-y-0.5">
                  {locations
                    .filter((l) => !l.esBase)
                    .map((l) => {
                      const selected = selectedParadas.some((p) => p.id === l.id)
                      return (
                        <label
                          key={l.id}
                          className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-xs ${
                            selected
                              ? 'bg-orange-50 border border-orange-200'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleParada(l)}
                            className="w-3.5 h-3.5 accent-orange-500"
                          />
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          <span className="font-medium">{l.nombre}</span>
                          <span className="text-[10px] text-slate-400 ml-auto">{l.provincia}</span>
                        </label>
                      )
                    })}
                </div>
              </ScrollArea>
            </div>

            {selectedParadas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs">Orden de paradas ({selectedParadas.length})</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1"
                      onClick={optimizarRuta}
                      disabled={optimizando}
                    >
                      <RefreshCw className={`w-3 h-3 ${optimizando ? 'animate-spin' : ''}`} />
                      Optimizar
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md max-h-[180px] overflow-y-auto">
                  {selectedParadas.map((p, idx) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={() => setDragIdx(null)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 text-xs border-b last:border-b-0 cursor-grab active:cursor-grabbing ${
                        dragIdx === idx ? 'bg-orange-100 opacity-60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate flex-1">{p.nombre}</span>
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          disabled={idx === 0}
                          onClick={() => moveParada(idx, -1)}
                        > ▲ </button>
                        <button
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          disabled={idx === selectedParadas.length - 1}
                          onClick={() => moveParada(idx, 1)}
                        > ▼ </button>
                        <button
                          className="p-0.5 text-red-300 hover:text-red-500 ml-1"
                          onClick={() => setSelectedParadas((prev) => prev.filter((x) => x.id !== p.id))}
                        > ✕ </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={crearRuta}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
              disabled={selectedParadas.length === 0}
            >
              <Plus className="w-4 h-4 mr-1" /> Crear Ruta
            </Button>
          </CardContent>
        </Card>

        {/* Lista de rutas existentes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-500" />
              Rutas Planificadas
            </CardTitle>
            <CardDescription>
              {loading ? 'Cargando...' : `${rutas.length} ruta(s) registrada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : rutas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <RouteIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                No hay rutas creadas todavía
              </div>
            ) : (
              <div className="space-y-2">
                {rutas.map((r) => {
                  const total = r.paradas.length
                  const entregadas = r.paradas.filter((p) => p.estado === 'ENTREGADO').length
                  const vAsignado = (r as any).vehicle || vehiculos.find(v => v.id === (r as any).vehicleId)
                  return (
                    <div key={r.id} className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate text-sm">{r.nombre}</h3>
                          <p className="text-[10px] text-slate-500">
                            {new Date(r.createdAt).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                        <Badge
                          variant={r.estado === 'COMPLETADA' ? 'default' : r.estado === 'EN_PROGRESO' ? 'secondary' : 'outline'}
                          className="text-[10px]"
                        >
                          {r.estado.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Vehículo asignado */}
                      {vAsignado && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-sky-700 bg-sky-50 rounded px-2 py-1">
                          <Truck className="w-3 h-3" />
                          <span>{vAsignado.patente} — {vAsignado.marca} {vAsignado.modelo}</span>
                          {(r as any).costoTotal && (
                            <span className="ml-auto font-mono">${(r as any).costoTotal}</span>
                          )}
                        </div>
                      )}

                      {r.estado === 'EN_PROGRESO' && (
                        <div className="mb-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                            <span>{entregadas} de {total} entregados</span>
                            <span>{total > 0 ? Math.round(entregadas / total * 100) : 0}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${total > 0 ? entregadas / total * 100 : 0}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 text-[10px] mb-1.5 text-slate-600">
                        <span className="tabular-nums">{r.distanciaKm} km</span>
                        <span className="tabular-nums">{r.duracionHoras} h</span>
                        <span>{r.paradas.length} paradas</span>
                        {(r as any).costoTotal && (
                          <span className="tabular-nums text-emerald-600">${(r as any).costoTotal}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {r.paradas.map((p, idx) => (
                          <Badge
                            key={p.id}
                            variant={p.estado === 'ENTREGADO' ? 'default' : 'outline'}
                            className={`text-[9px] py-0 h-4 ${p.estado === 'ENTREGADO' ? 'bg-emerald-500' : ''}`}
                          >
                            {p.estado === 'ENTREGADO' ? '✓' : idx + 1}. {p.nombre}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 pt-1.5 border-t border-slate-100">
                        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setRutaSeleccionada(r)}>
                          <MapIcon className="w-3 h-3 mr-1" /> Mapa
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => cambiarEstado(r, 'EN_PROGRESO')} disabled={r.estado !== 'PLANIFICADA'}>
                          Iniciar
                        </Button>
                        {r.estado === 'EN_PROGRESO' && (
                          <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => iniciarNavegacion(r)}>
                            <Truck className="w-3 h-3 mr-1" /> Navegar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => cambiarEstado(r, 'COMPLETADA')} disabled={r.estado === 'COMPLETADA'}>
                          Completar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-500 hover:bg-red-50 ml-auto" onClick={() => eliminarRuta(r.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mapa de ruta seleccionada con geocercas */}
      {rutaSeleccionada && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Mapa de Ruta: {rutaSeleccionada.nombre}</CardTitle>
                <CardDescription>
                  {rutaSeleccionada.distanciaKm} km · {rutaSeleccionada.duracionHoras} h ·{' '}
                  {rutaSeleccionada.paradas.length} paradas · Origen y retorno
                  {(rutaSeleccionada as any).costoTotal && (
                    <> · <span className="text-emerald-600">${(rutaSeleccionada as any).costoTotal}</span></>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {rutaSeleccionada.estado === 'EN_PROGRESO' && (
                  <Button size="sm" onClick={() => iniciarNavegacion(rutaSeleccionada)}>
                    <Truck className="w-3 h-3 mr-1" /> Navegar
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setRutaSeleccionada(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MapView
              markers={rutaMarkers}
              routes={rutaRoutes}
              geocercas={geocercas.filter(g => g.activa)}
              height="450px"
            />
          </CardContent>
        </Card>
      )}

      {/* Diálogo de navegación con GPS */}
      <Dialog open={!!navegando} onOpenChange={(o) => { if (!o) { setNavegando(null); setCurrentStopIdx(0); setGpsSimulando(false); setGpsPings([]); load() } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {navegando && (() => {
            const r = navegando
            const restantes = r.paradas.filter((p) => p.estado !== 'ENTREGADO')
            const actual = restantes[0] || r.paradas[r.paradas.length - 1]

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-500" />
                    Navegando: {r.nombre}
                  </DialogTitle>
                </DialogHeader>

                {/* Parada actual */}
                {actual && (
                  <Card className="border-emerald-300 bg-emerald-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                          {restantes.indexOf(actual) + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-emerald-600 font-medium">PRÓXIMA PARADA</p>
                          <h3 className="font-bold text-lg">{actual.nombre}</h3>
                          <p className="text-xs text-slate-500">{actual.provincia}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* GPS en vivo */}
                <div className="bg-slate-50 border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Navigation className={`w-3 h-3 ${gpsSimulando ? 'text-green-500 animate-pulse' : 'text-slate-400'}`} />
                      GPS {gpsSimulando ? 'EN VIVO' : 'Detenido'}
                    </Label>
                    <Button
                      size="sm"
                      variant={gpsSimulando ? 'destructive' : 'outline'}
                      className="h-6 text-[10px]"
                      onClick={toggleGpsSimulacion}
                    >
                      {gpsSimulando ? 'Detener GPS' : 'Simular GPS'}
                    </Button>
                  </div>
                  {gpsPings.length > 0 && (
                    <div className="text-[10px] text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Lat / Lng</span>
                        <span className="font-mono">{gpsPings[0].lat.toFixed(4)}, {gpsPings[0].lng.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Velocidad</span>
                        <span className="font-mono">{gpsPings[0].velocidad || '?'} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Precisión</span>
                        <span className="font-mono">{gpsPings[0].precision || '?'} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pings registrados</span>
                        <span className="font-mono">{gpsPings.length}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lista de paradas */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">
                    Paradas ({restantes.length} restantes de {r.paradas.length})
                  </Label>
                  <div className="space-y-1">
                    {r.paradas.map((p, idx) => {
                      const delivered = p.estado === 'ENTREGADO'
                      const isCurrent = restantes.length > 0 && p.id === restantes[0].id && !delivered
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 p-2 rounded-md text-sm border ${
                            delivered
                              ? 'bg-emerald-50 border-emerald-200'
                              : isCurrent
                              ? 'bg-orange-50 border-orange-300'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            delivered ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {delivered ? '✓' : idx + 1}
                          </div>
                          <span className={`flex-1 ${delivered ? 'line-through text-slate-400' : ''}`}>{p.nombre}</span>
                          <span className="text-[10px] text-slate-400">{p.provincia}</span>
                          {!delivered && isCurrent && (
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => marcarEntregado(p.id)}>
                              Entregado
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Resumen */}
                <div className="bg-slate-50 rounded-lg p-3 border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Distancia total</span>
                    <span className="font-mono">{r.distanciaKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duración estimada</span>
                    <span className="font-mono">{r.duracionHoras} h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entregados</span>
                    <span className="font-mono text-emerald-600">{r.paradas.filter((p) => p.estado === 'ENTREGADO').length} / {r.paradas.length}</span>
                  </div>
                  {(r as any).costoTotal && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Costo total</span>
                      <span className="font-mono text-emerald-600">${(r as any).costoTotal}</span>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setNavegando(null); setCurrentStopIdx(0); setGpsSimulando(false); setGpsPings([]); load() }}>
                    Cerrar navegación
                  </Button>
                  {restantes.length === 0 && (
                    <Button onClick={() => cambiarEstado(r, 'COMPLETADA').then(() => { setNavegando(null); setCurrentStopIdx(0); setGpsSimulando(false); setGpsPings([]) })}>
                      Finalizar ruta
                    </Button>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
