'use client'

import { useState, useEffect } from 'react'
import { BookOpen, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { SgaBadge } from '@/lib/tab-constants'
import { GASES, CAPACIDADES_LITROS } from '@/lib/catalogo'
import type { Gas } from '@/lib/tab-types'

export default function CatalogoTab() {
  const [gases, setGases] = useState<Gas[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gases')
      .then((r) => r.json())
      .then((data) => {
        setGases(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  const categorias = ['INERTE', 'ACTIVO', 'COMBUSTIBLE', 'COMBURENTE']
  const categoriaColor: Record<string, string> = {
    INERTE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ACTIVO: 'bg-amber-50 text-amber-700 border-amber-200',
    COMBUSTIBLE: 'bg-red-50 text-red-700 border-red-200',
    COMBURENTE: 'bg-sky-50 text-sky-700 border-sky-200',
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-slate-800">
                Catálogo Técnico de Gases para Soldadura
              </h2>
              <p className="text-sm text-slate-500">
                Información de tipos de gases, presiones de carga, colores de
                identificación (norma IRAM 2588) y aplicaciones en soldadura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {categorias.map((cat) => {
        const gasesCat = gases.filter((g) => g.categoria === cat)
        if (gasesCat.length === 0) return null
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={`${categoriaColor[cat]} border`}>{cat}</Badge>
              <span className="text-sm text-slate-500">
                {gasesCat.length} gas(es) en esta categoría
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gasesCat.map((g) => (
                <Card key={g.id} className="overflow-hidden">
                  <div
                    className="h-2"
                    style={{ background: g.colorHex }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner"
                        style={{ background: g.colorHex }}
                      >
                        <span
                          className="font-bold text-xs"
                          style={{
                            color: ['#FFFFFF', '#808080'].includes(g.colorHex.toUpperCase())
                              ? '#1e293b'
                              : 'white',
                          }}
                        >
                          {g.codigo}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg text-slate-900">
                          {g.nombre}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          Código: {g.codigo} · {g._count?.cylinders || 0} tubo(s) en
                          stock
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {g.descripcion}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Presión de carga</span>
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {g.presionBar} bar
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Uso principal</span>
                        <span className="font-medium text-slate-800 text-right text-xs">
                          {g.usoPrincipal}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Riesgo SGA</span>
                        <SgaBadge peligro={g.peligro} />
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-t border-slate-100">
                        <span className="text-slate-500">Color del tubo (IRAM 2588)</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-slate-300"
                            style={{ background: g.colorHex }}
                          />
                          <span className="font-mono text-xs text-slate-600">
                            {g.colorHex}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">Normas de seguridad generales</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-xs">
                <li>
                  Los tubos de oxígeno (O₂) nunca deben entrar en contacto con
                  aceites, grasas o combustibles (riesgo de explosión).
                </li>
                <li>
                  Los tubos de acetileno deben almacenarse y transportarse en
                  posición vertical (contienen acetona como solvente).
                </li>
                <li>
                  Todos los tubos deben superar la prueba hidrostática cada 5 años.
                </li>
                <li>
                  Transportar con capuchón de protección y asegurar contra
                  volcadura en el vehículo.
                </li>
                <li>
                  Ventilar el área de almacenamiento y mantener separados gases
                  combustibles de comburentes.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
