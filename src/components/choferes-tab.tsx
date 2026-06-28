'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import {
  Truck,
  MapPin,
  Navigation,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { MapMarker } from '@/components/map-view'

const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
      <div className="text-slate-500">Cargando mapa...</div>
    </div>
  ),
})

interface ConductorActivo {
  id: string
  conductor: { id: string; nombre: string; usuario: string; telefono: string | null }
  ruta: {
    id: string
    nombre: string
    estado: string
    distanciaKm: number | null
    vehicle: { patente: string; marca: string; modelo: string } | null
    paradas: { id: string; nombre: string }[]
  } | null
  lat: number | null
  lng: number | null
  velocidad: number | null
  ultimoHeartbeat: string
  paradasPendientes: number
  tiempoOfflineMin: number
}

export default function ChoferesTab() {
  const [activos, setActivos] = useState<ConductorActivo[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch('/api/chofer/activos')
      if (res.ok) setActivos(await res.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const markers: MapMarker[] = activos
    .filter((a) => a.lat && a.lng)
    .map((a) => ({
      id: a.conductor.id,
      lat: a.lat!,
      lng: a.lng!,
      color: '#16a34a',
      label: a.conductor.nombre.split(' ')[0],
      popup: `
        <b>${a.conductor.nombre}</b><br/>
        ${a.ruta ? `Ruta: ${a.ruta.nombre}` : 'Sin ruta'}<br/>
        ${a.ruta?.vehicle ? `${a.ruta.vehicle.marca} ${a.ruta.vehicle.modelo} (${a.ruta.vehicle.patente})` : ''}<br/>
        ${a.paradasPendientes} paradas pendientes
      `,
    }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-800">Choferes en Vivo</h2>
          <Badge variant="secondary" className="text-xs ml-2">
            {activos.length} en línea
          </Badge>
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <Clock className="w-3 h-3 mr-1" /> Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <MapView
            markers={markers}
            height="400px"
            zoom={7}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-[200px] rounded-xl" />
      ) : activos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay choferes en línea</p>
            <p className="text-xs mt-1">Los choferes aparecen aquí cuando inician sesión desde la app /chofer</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activos.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    {a.conductor.nombre}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Wifi className="w-3 h-3 mr-1" /> En línea
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-1">
                {a.lat && a.lng && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                  </div>
                )}
                {a.velocidad != null && (
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-slate-400" />
                    {a.velocidad.toFixed(1)} km/h
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Heartbeat: hace {a.tiempoOfflineMin} min
                </div>
                {a.ruta ? (
                  <>
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="font-medium text-slate-800">{a.ruta.nombre}</div>
                      {a.ruta.vehicle && (
                        <div className="text-slate-500">
                          {a.ruta.vehicle.marca} {a.ruta.vehicle.modelo} · {a.ruta.vehicle.patente}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {a.paradasPendientes} pendientes
                        </Badge>
                        {a.ruta.distanciaKm && (
                          <span className="text-slate-400">{a.ruta.distanciaKm.toFixed(1)} km</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 pt-2 border-t border-slate-100 text-slate-400 italic">
                    Sin ruta asignada
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
