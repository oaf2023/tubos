'use client'

import { useState, useEffect, useCallback } from 'react'
import { Cloud, CloudSun, CloudRain, CloudLightning, Sun, Snowflake, Loader2, AlertCircle } from 'lucide-react'

interface ClimaReg {
  id: string
  fecha: string
  fechaDate: string
  momento: string
  fuente: string
  temperatura: number | null
  sensTermica: number | null
  humedad: number | null
  vientoVel: number | null
  vientoDir: string | null
  presion: number | null
  codigoClima: number | null
  descripcion: string | null
  precipitacion: number | null
}

const FUENTE_LABEL: Record<string, string> = {
  local: 'Local',
  SMN: 'SMN',
  foranea: 'Foránea',
}

const FUENTE_COLOR: Record<string, string> = {
  local: 'bg-blue-100 text-blue-700',
  SMN: 'bg-emerald-100 text-emerald-700',
  foranea: 'bg-purple-100 text-purple-700',
}

function momentoIcon(m: string) {
  switch (m) {
    case 'manana': return <Sun className="w-3.5 h-3.5 text-amber-500" />
    case 'tarde': return <CloudSun className="w-3.5 h-3.5 text-amber-600" />
    case 'noche': return <Cloud className="w-3.5 h-3.5 text-slate-500" />
    default: return null
  }
}

function codigoToIcon(code: number | null) {
  if (code === null) return <Cloud className="w-4 h-4 text-slate-400" />
  if (code <= 3) return <Sun className="w-4 h-4 text-amber-400" />
  if (code <= 48) return <Cloud className="w-4 h-4 text-slate-500" />
  if (code <= 57) return <CloudRain className="w-4 h-4 text-blue-500" />
  if (code <= 67) return <CloudRain className="w-4 h-4 text-blue-600" />
  if (code <= 77) return <Snowflake className="w-4 h-4 text-cyan-400" />
  if (code <= 82) return <CloudRain className="w-4 h-4 text-blue-700" />
  return <CloudLightning className="w-4 h-4 text-orange-500" />
}

export default function ClimaHistorico() {
  const [data, setData] = useState<ClimaReg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fuenteFiltro, setFuenteFiltro] = useState<string>('todas')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '90' })
      if (fuenteFiltro !== 'todas') params.set('fuente', fuenteFiltro)
      const res = await fetch(`/api/clima?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [fuenteFiltro])

  useEffect(() => { fetchData() }, [fetchData])

  const fuentes = ['todas', 'local', 'SMN', 'foranea']

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          {fuentes.map(f => (
            <button
              key={f}
              onClick={() => setFuenteFiltro(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                fuenteFiltro === f
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f === 'todas' ? 'Todas' : FUENTE_LABEL[f] || f}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-2 py-1 text-xs rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando datos climáticos...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">Momento</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">Fuente</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">Temp</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">ST</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">Humedad</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">Viento</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">Presión</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">Clima</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-slate-400">Sin datos climáticos</td>
                  </tr>
                ) : (
                  data.map((r, i) => (
                    <tr key={r.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-sky-50/50 transition-colors`}>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap font-mono">
                        {new Date(r.fechaDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          {momentoIcon(r.momento)}
                          <span className="text-slate-500 capitalize">{r.momento}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${FUENTE_COLOR[r.fuente] || 'bg-slate-100 text-slate-600'}`}>
                          {FUENTE_LABEL[r.fuente] || r.fuente}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {r.temperatura !== null ? `${r.temperatura.toFixed(1)}°` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-400">
                        {r.sensTermica !== null ? `${r.sensTermica.toFixed(1)}°` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                        {r.humedad !== null ? `${r.humedad}%` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                        {r.vientoVel !== null ? `${r.vientoVel.toFixed(0)} km/h` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-500">
                        {r.presion !== null ? `${r.presion.toFixed(0)} hPa` : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span title={r.descripcion || ''}>
                          {codigoToIcon(r.codigoClima)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate" title={r.descripcion || ''}>
                        {r.descripcion || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      {!loading && data.length > 0 && (
        <div className="text-[10px] text-slate-400 text-right">
          {data.length} registros
        </div>
      )}
    </div>
  )
}
