'use client'

import { useEffect, useState } from 'react'
import {
  Layers, Package, AlertTriangle, DollarSign, BarChart3,
  RefreshCw, TrendingUp, FileBarChart, List,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ArticuloStats {
  total: number
  conStock: number
  sinStock: number
  totalValor: number
  lowStock: { ART_CODI: number; ART_DET1: string; ART_STIN: number; ART_SMIN: number; ART_UNID: string }[]
  byMarca: { codigo: number; cantidad: number }[]
  byRubro: { codigo: number; cantidad: number }[]
  bySubrubro: { codigo: number; cantidad: number }[]
  byDpto: { codigo: number; cantidad: number }[]
  byUnidad: { unidad: string; cantidad: number }[]
  precioRanges: { rango: string; cantidad: number }[]
}

const RANGO_COLORS: Record<string, string> = {
  'Sin precio': 'bg-slate-200',
  '0-100': 'bg-emerald-500',
  '100-500': 'bg-blue-500',
  '500-2K': 'bg-amber-500',
  '2K-10K': 'bg-orange-500',
  '10K+': 'bg-red-500',
}

export default function DashboardArticulos() {
  const [stats, setStats] = useState<ArticuloStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/articulos/stats')
      if (!res.ok) throw new Error('Error al cargar stats')
      const j = await res.json()
      setStats(j)
    } catch { setStats(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  const maxRange = Math.max(...stats.precioRanges.map(r => r.cantidad), 1)
  const maxRubro = Math.max(...stats.byRubro.map(r => r.cantidad), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Dashboard Inventario Artículos</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20"><Package className="w-5 h-5" /></div>
            <div>
              <div className="text-xs opacity-80">Total Artículos</div>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20"><Package className="w-5 h-5" /></div>
            <div>
              <div className="text-xs opacity-80">Con Stock</div>
              <div className="text-2xl font-bold">{stats.conStock.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20"><AlertTriangle className="w-5 h-5" /></div>
            <div>
              <div className="text-xs opacity-80">Sin Stock</div>
              <div className="text-2xl font-bold">{stats.sinStock.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20"><DollarSign className="w-5 h-5" /></div>
            <div>
              <div className="text-xs opacity-80">Valor Total</div>
              <div className="text-lg font-bold">${(stats.totalValor).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Distribución por Rango de Precio
            </CardTitle>
            <CardDescription>Cantidad de artículos según precio de venta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.precioRanges.map((r) => {
              const pct = (r.cantidad / maxRange) * 100
              return (
                <div key={r.rango} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{r.rango}</span>
                    <span className="font-semibold text-slate-900">{r.cantidad.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${RANGO_COLORS[r.rango] || 'bg-slate-400'} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <List className="w-4 h-4 text-violet-500" />
              Distribución por Rubro
            </CardTitle>
            <CardDescription>Top 15 rubros por cantidad de artículos</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-2">
                {stats.byRubro.map((r, idx) => {
                  const pct = (r.cantidad / maxRubro) * 100
                  return (
                    <div key={r.codigo} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 w-5">#{idx + 1}</span>
                          <span className="font-medium text-slate-700">Rubro {r.codigo}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{r.cantidad.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Distribución por Marca
            </CardTitle>
            <CardDescription>Top 15 marcas por cantidad de artículos</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-2">
                {stats.byMarca.map((r, idx) => (
                  <div key={r.codigo} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 w-5">#{idx + 1}</span>
                      <span className="font-medium text-sm text-slate-700">Marca {r.codigo}</span>
                    </div>
                    <Badge variant="secondary" className="font-bold tabular-nums">{r.cantidad}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileBarChart className="w-4 h-4 text-sky-500" />
              Distribución por Subrubro
            </CardTitle>
            <CardDescription>Top 15 subrubros por cantidad de artículos</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-2">
                {stats.bySubrubro.map((r, idx) => (
                  <div key={r.codigo} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 w-5">#{idx + 1}</span>
                      <span className="font-medium text-sm text-slate-700">Subrubro {r.codigo}</span>
                    </div>
                    <Badge variant="secondary" className="font-bold tabular-nums">{r.cantidad}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <List className="w-4 h-4 text-amber-500" />
              Distribución por Departamento
            </CardTitle>
            <CardDescription>Top 15 departamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-2">
                {stats.byDpto.map((r, idx) => (
                  <div key={r.codigo} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 w-5">#{idx + 1}</span>
                      <span className="font-medium text-sm text-slate-700">Dpto {r.codigo}</span>
                    </div>
                    <Badge variant="secondary" className="font-bold tabular-nums">{r.cantidad}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              Distribución por Unidad
            </CardTitle>
            <CardDescription>Unidades de medida más usadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-2">
                {stats.byUnidad.map((r) => (
                  <div key={r.unidad} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <span className="font-medium text-sm text-slate-700">{r.unidad || '(sin unidad)'}</span>
                    <Badge variant="secondary" className="font-bold tabular-nums">{r.cantidad}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alertas de Stock Mínimo
          </CardTitle>
          <CardDescription>{stats.lowStock.length} artículos por debajo del stock mínimo</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.lowStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                <Package className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-slate-700">Stock saludable</p>
              <p className="text-xs text-slate-500">Todos los artículos tienen stock suficiente</p>
            </div>
          ) : (
            <ScrollArea className="h-[260px] pr-4">
              <div className="space-y-2">
                {stats.lowStock.map((r) => (
                  <div key={r.ART_CODI} className="flex items-center gap-3 p-2 rounded-lg border border-amber-100 bg-amber-50/50">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-800 truncate">{r.ART_DET1}</div>
                      <div className="text-xs text-slate-500">Código: {r.ART_CODI} · Unidad: {r.ART_UNID || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Stock actual</div>
                      <div className="font-bold text-amber-600">{r.ART_STIN ?? 0}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Stock mínimo</div>
                      <div className="font-bold text-red-600">{r.ART_SMIN}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <button onClick={load} className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar datos
        </button>
      </div>
    </div>
  )
}
