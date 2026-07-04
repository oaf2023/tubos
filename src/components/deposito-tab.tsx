'use client'

import { useEffect, useState } from 'react'
import {
  Warehouse, Search, RefreshCw, MapPin,
  PackageOpen, FlaskConical, Truck, AlertTriangle,
  Wrench, Skull, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ESTADO_COLORS, ESTADO_LABELS } from '@/lib/tab-constants'

const ICONOS_ESTADO: Record<string, any> = {
  LLENO: PackageOpen,
  VACIO: FlaskConical,
  EN_REPARTO: Truck,
  EN_CARGA: AlertTriangle,
  MANTENIMIENTO: Wrench,
  BAJA: Skull,
}

export default function DepositoTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>('all')
  const [busqueda, setBusqueda] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroUbicacion && filtroUbicacion !== 'all') params.set('ubicacion', filtroUbicacion)
      const res = await fetch(`/api/deposito/resumen?${params}`)
      setData(await res.json())
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [filtroUbicacion])

  const totales: Record<string, number> = {}
  if (data) {
    const src = filtroUbicacion !== 'all' && data.stockPorUbicacion.length === 1
      ? data.stockPorUbicacion[0]
      : { estados: {} }
    if (filtroUbicacion === 'all') {
      for (const u of data.stockPorUbicacion) {
        for (const [est, cnt] of Object.entries(u.estados)) {
          totales[est] = (totales[est] || 0) + (cnt as number)
        }
      }
    } else {
      for (const u of data.stockPorUbicacion) {
        if (u.ubicacion === filtroUbicacion) {
          for (const [est, cnt] of Object.entries(u.estados)) {
            totales[est] = (totales[est] || 0) + (cnt as number)
          }
        }
      }
    }
  }

  const estadosVisibles = ['LLENO', 'VACIO', 'EN_REPARTO', 'EN_CARGA', 'MANTENIMIENTO', 'BAJA', 'EN_DEPOSITO', 'EN_CLIENTE', 'RETENIDO', 'EXTRAVIADO', 'PH_VENCIDO', 'EN_USO']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold">Depósito</h2>
          {data && <Badge variant="outline" className="text-xs">{data.total} cilindros</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <Select value={filtroUbicacion} onValueChange={setFiltroUbicacion}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las ubicaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ubicaciones</SelectItem>
                {data?.locations?.map((l: string) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
                <SelectItem value="BASE">BASE (legacy)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : !data ? (
        <div className="text-center py-12 text-slate-400">Error al cargar datos</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {estadosVisibles.map(est => {
              if (!(est in totales)) return null
              const Icon = ICONOS_ESTADO[est] || Layers
              const colorClass = ESTADO_COLORS[est] || 'bg-slate-400'
              const cnt = totales[est] || 0
              if (cnt === 0) return null
              return (
                <Card key={est}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                      <span className="text-2xl font-bold">{cnt}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{ESTADO_LABELS[est] || est}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock por Tipo de Gas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-4">Gas</th>
                      {estadosVisibles.filter(e => totales[e] > 0).map(est => (
                        <th key={est} className="py-2 pr-4 text-right">{ESTADO_LABELS[est] || est}</th>
                      ))}
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stockPorGas.map((g: any) => (
                      <tr key={g.gas.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium">
                          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: g.gas.colorHex }} />
                          {g.gas.codigo} — {g.gas.nombre}
                        </td>
                        {estadosVisibles.filter(e => totales[e] > 0).map(est => (
                          <td key={est} className="py-2 pr-4 text-right">{g.estados[est] || 0}</td>
                        ))}
                        <td className="py-2 text-right font-bold">{g.total}</td>
                      </tr>
                    ))}
                    {data.stockPorGas.length === 0 && (
                      <tr><td colSpan={20} className="py-8 text-center text-slate-400">Sin datos de stock</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock por Ubicación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="py-2 pr-4">Ubicación</th>
                      {estadosVisibles.filter(e => totales[e] > 0).map(est => (
                        <th key={est} className="py-2 pr-4 text-right">{ESTADO_LABELS[est] || est}</th>
                      ))}
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stockPorUbicacion.filter((u: any) => filtroUbicacion === 'all' || u.ubicacion === filtroUbicacion).map((u: any) => (
                      <tr key={u.ubicacion} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium">{u.ubicacion}</td>
                        {estadosVisibles.filter(e => totales[e] > 0).map(est => (
                          <td key={est} className="py-2 pr-4 text-right">{u.estados[est] || 0}</td>
                        ))}
                        <td className="py-2 text-right font-bold">{u.total}</td>
                      </tr>
                    ))}
                    {data.stockPorUbicacion.length === 0 && (
                      <tr><td colSpan={20} className="py-8 text-center text-slate-400">Sin datos de stock</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
