'use client'

import { BarChart3 } from 'lucide-react'

export default function GerenciaTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-yellow-600" />
        <h2 className="text-2xl font-bold">Gerencia</h2>
      </div>
      <p className="text-slate-500">Módulo Gerencia — en construcción. Próximamente: dashboard ejecutivo con KPIs de Mercado Libre y Mercado Pago.</p>
    </div>
  )
}
