import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export const SGA_PELIGROS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  INFLAMABLE: { label: 'Inflamable', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  COMBURENTE: { label: 'Comburente', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  GAS_PRESION: { label: 'Gas a Presión', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  NINGUNO: { label: 'Sin Riesgo', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
}

export function SgaBadge({ peligro }: { peligro: string }) {
  const info = SGA_PELIGROS[peligro] || SGA_PELIGROS.GAS_PRESION
  return (
    <Badge variant="outline" className={`${info.bg} ${info.text} ${info.border} text-[10px] px-1.5 py-0 leading-tight`}>
      {info.label}
    </Badge>
  )
}

export const ESTADO_COLORS: Record<string, string> = {
  LLENO: 'bg-emerald-500',
  EN_USO: 'bg-amber-500',
  VACIO: 'bg-slate-400',
  MANTENIMIENTO: 'bg-red-500',
  TRANSITO: 'bg-blue-500',
}

export const ESTADO_LABELS: Record<string, string> = {
  LLENO: 'Lleno',
  EN_USO: 'En uso',
  VACIO: 'Vacío',
  MANTENIMIENTO: 'Mantenimiento',
  TRANSITO: 'En tránsito',
}

export function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function daysUntil(s: string): number {
  const now = new Date()
  const d = new Date(s)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tabular-nums">
              {value}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-md flex-shrink-0`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const TIPOLOGIAS = [
  'Metalúrgica Pesada', 'Construcción Pesada', 'Taller Metalúrgico',
  'Herrería Artística', 'Estructuras Metálicas', 'Calderería',
  'Comercio Industrial', 'Servicios de Soldadura', 'Industria Metalúrgica',
  'Aceros', 'Industria Pesada', 'Taller Mecánico', 'Construcción',
  'Carrocerías', 'Soldadura Especializada', 'Farmacéutico',
]

export const ESTADO_CUENTA_OPTS = ['AL_DIA', 'PENDIENTE', 'MOROSO']

export const NODE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  Cylinder: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e' },
  Gas: { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af' },
  Cliente: { fill: '#d1fae5', stroke: '#10b981', text: '#065f46' },
  Location: { fill: '#f3e8ff', stroke: '#a855f7', text: '#4c1d95' },
  Movimiento: { fill: '#fce7f3', stroke: '#ec4899', text: '#9d174d' },
  Mantenimiento: { fill: '#f5f5f4', stroke: '#78716c', text: '#44403c' },
}
