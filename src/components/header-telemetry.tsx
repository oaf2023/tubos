'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Gauge, Cpu, MemoryStick, HardDrive, Activity, RefreshCw, Server, ArrowDown, ArrowUp, Loader2, AlertTriangle, Clock } from 'lucide-react'

function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = -1
  do {
    v /= 1024
    i++
  } while (v >= 1024 && i < units.length - 1)
  return `${v.toFixed(1)} ${units[i]}`
}

function barColor(v: number | null | undefined): string {
  if (v == null) return 'bg-slate-300'
  if (v >= 90) return 'bg-red-500'
  if (v >= 75) return 'bg-amber-500'
  return 'bg-green-500'
}

function healthStyle(cls: string | undefined): { bg: string; text: string } {
  switch (cls) {
    case 'EXCELENTE': return { bg: 'bg-green-100', text: 'text-green-700' }
    case 'NORMAL': return { bg: 'bg-emerald-100', text: 'text-emerald-700' }
    case 'ATENCION': return { bg: 'bg-amber-100', text: 'text-amber-700' }
    case 'DEGRADADO': return { bg: 'bg-orange-100', text: 'text-orange-700' }
    default: return { bg: 'bg-red-100', text: 'text-red-700' }
  }
}

function StatBar({ label, icon: Icon, value, display }: { label: string; icon: any; value: number | null | undefined; display: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-slate-600">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
          {label}
        </span>
        <span className="font-semibold tabular-nums">{display}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(value)}`}
          style={{ width: `${Math.min(Math.max(value ?? 0, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function HeaderTelemetry() {
  const [open, setOpen] = useState(false)
  const [snap, setSnap] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/snapshot', { cache: 'no-store' })
      if (res.ok) setSnap(await res.json())
    } catch {
      setSnap(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && !snap) void load()
  }, [open, snap, load])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const sys = snap?.system || {}
  const cpu = snap?.cpu || {}
  const mem = snap?.memory || {}
  const disks = snap?.disks?.disks || []
  const net = snap?.network || {}
  const procs = snap?.top_processes || []
  const health = snap?.health || {}
  const alerts = snap?.alerts || []
  const maxDisk = disks.length ? Math.max(0, ...disks.map((d: any) => d.usage_percent ?? 0)) : null
  const hs = healthStyle(health.classification)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) void load() }}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        title="Telemetría — estado del servidor"
      >
        <Gauge className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-medium text-slate-700">
                Servidor {sys.hostname || '—'}
              </span>
            </div>
            <button
              onClick={() => void load()}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading && !snap ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Consultando telemetría…
            </div>
          ) : !snap ? (
            <p className="text-center text-xs text-slate-400 py-8">No se pudo obtener telemetría</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${hs.bg} ${hs.text}`}>
                  HEALTH {health.score ?? 0}/100 · {health.classification || '—'}
                </span>
                {alerts.length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                    <AlertTriangle className="w-3 h-3" /> {alerts.length} alerta(s)
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <StatBar label="CPU" icon={Cpu} value={cpu.usage_percent} display={cpu.usage_percent != null ? `${cpu.usage_percent}%` : '—'} />
                <StatBar label="RAM" icon={MemoryStick} value={mem.usage_percent} display={mem.usage_percent != null ? `${mem.usage_percent}% (${fmtBytes(mem.used_bytes)} / ${fmtBytes(mem.total_bytes)})` : '—'} />
                <StatBar label="Disco" icon={HardDrive} value={maxDisk} display={maxDisk != null ? `${maxDisk}%` : '—'} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-slate-400" />
                  <span>Load: {cpu.load_average_1m != null ? cpu.load_average_1m.toFixed(2) : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Uptime: {sys.uptime_human || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowDown className="w-3 h-3 text-emerald-500" />
                  <span>↓ {net.download_mbps != null ? `${net.download_mbps} Mbps` : '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUp className="w-3 h-3 text-sky-500" />
                  <span>↑ {net.upload_mbps != null ? `${net.upload_mbps} Mbps` : '—'}</span>
                </div>
              </div>

              {alerts.length > 0 && (
                <div className="space-y-1">
                  {alerts.slice(0, 3).map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 rounded-md px-2 py-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>{a.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-1">Top procesos</p>
                <div className="space-y-0.5">
                  {procs.slice(0, 3).map((p: any) => (
                    <div key={p.pid} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[180px]">{p.name}</span>
                      <span className="tabular-nums shrink-0">
                        {p.cpu_percent != null ? `${p.cpu_percent}% CPU · ` : ''}{p.memory_percent != null ? `${p.memory_percent}% RAM` : '—'}
                      </span>
                    </div>
                  ))}
                  {procs.length === 0 && <p className="text-[11px] text-slate-400">Sin datos de procesos</p>}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                <span>{sys.os} {sys.release} · {sys.architecture}</span>
                <span className="tabular-nums">{snap.timestamp ? new Date(snap.timestamp).toLocaleTimeString('es-AR') : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
