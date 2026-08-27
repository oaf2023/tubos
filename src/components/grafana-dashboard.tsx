'use client'

import { useState } from 'react'

const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || ''

const DASHBOARDS = [
  { uid: 'gastrack-panel-general', label: 'Panel General', desc: 'KPIs principales del sistema' },
  { uid: 'gastrack-inventario', label: 'Inventario', desc: 'Stock de tubos, rotación, PH' },
  { uid: 'gastrack-finanzas', label: 'Finanzas', desc: 'Facturación, aging, ingresos' },
  { uid: 'gastrack-logistica', label: 'Logística', desc: 'Rutas, flota, combustible' },
  { uid: 'gastrack-rfid-iot', label: 'RFID/IoT', desc: 'Eventos RFID, tags, lectores' },
  { uid: 'gastrack-calidad', label: 'Calidad', desc: 'Validaciones, alertas, consistencia' },
  { uid: 'gastrack-sistema', label: 'Sistema', desc: 'CPU, RAM, disco, health score' },
]

export default function GrafanaDashboard() {
  const [selected, setSelected] = useState(DASHBOARDS[0].uid)

  if (!GRAFANA_URL) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-4">
        <div className="text-4xl">⚙️</div>
        <p className="text-sm text-center max-w-md">
          Configurá la variable de entorno <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-xs">NEXT_PUBLIC_GRAFANA_URL</code> con la URL de tu instancia de Grafana.
        </p>
        <p className="text-xs text-slate-400 text-center max-w-sm">
          Ejemplo: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono text-xs">https://tu-grafana.onrender.com</code>
        </p>
      </div>
    )
  }

  const iframeSrc = `${GRAFANA_URL}/d/${selected}?orgId=1&kiosk`

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {DASHBOARDS.map(d => (
          <button
            key={d.uid}
            onClick={() => setSelected(d.uid)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${selected === d.uid
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
            title={d.desc}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
        <iframe
          src={iframeSrc}
          width="100%"
          height={700}
          frameBorder="0"
          allowFullScreen
          className="w-full"
          style={{ minHeight: 700 }}
        />
      </div>

      <p className="text-[11px] text-slate-400 text-right">
        Fuente: <a href={GRAFANA_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">{GRAFANA_URL}</a>
      </p>
    </div>
  )
}
