'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Printer, Download, FileText } from 'lucide-react'

const REPORTES = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'tubos', label: 'Tubos' },
  { key: 'mantenimiento', label: 'Mantenimiento' },
  { key: 'rutas', label: 'Rutas' },
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'facturacion', label: 'Facturación' },
] as const

export default function ReportesTab() {
  const [activeReporte, setActiveReporte] = useState('clientes')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('opencode_user')
      if (saved) {
        const u = JSON.parse(saved)
        setUserName(u.nombre || u.usuario || '')
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    setData([])
    const fetchers: Record<string, string> = {
      clientes: '/api/clientes',
      tubos: '/api/cylinders',
      mantenimiento: '/api/cylinders',
      rutas: '/api/routes',
      catalogo: '/api/gases',
      pedidos: '/api/pedidos',
      facturacion: '/api/facturas',
    }
    const url = fetchers[activeReporte]
    if (!url) { setLoading(false); return }

    fetch(url)
      .then((r) => r.json().catch(() => []))
      .then((d) => {
        setData(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeReporte])

  function printReport() {
    window.print()
  }

  const now = new Date()
  const fechaHora = now.toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  function renderTable() {
    if (data.length === 0) {
      return <p className="text-slate-400 text-sm py-8 text-center">Sin datos</p>
    }

    switch (activeReporte) {
      case 'clientes':
        return (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-100">{['Nombre', 'Dirección', 'Teléfono', 'Email', 'CUIT'].map(h => <th key={h} className="border p-2 text-left text-xs font-semibold">{h}</th>)}</tr></thead>
            <tbody>{data.map((r: any, i: number) => <tr key={r.id || i} className="even:bg-slate-50"><td className="border p-2">{r.nombre}</td><td className="border p-2">{r.direccion || '—'}</td><td className="border p-2">{r.telefono || '—'}</td><td className="border p-2">{r.email || '—'}</td><td className="border p-2 font-mono text-xs">{r.cuit || '—'}</td></tr>)}</tbody>
          </table>
        )

      case 'tubos':
        return (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-100">{['Serie', 'Gas', 'Ubicación', 'Estado', 'Cliente', 'Próx. Retest'].map(h => <th key={h} className="border p-2 text-left text-xs font-semibold">{h}</th>)}</tr></thead>
            <tbody>{data.map((r: any, i: number) => <tr key={r.id || i} className="even:bg-slate-50"><td className="border p-2 font-mono text-xs">{r.numeroSerie}</td><td className="border p-2">{r.gas?.nombre || r.gasId}</td><td className="border p-2">{r.ubicacionNombre}</td><td className="border p-2">{r.estado}</td><td className="border p-2">{r.cliente || '—'}</td><td className="border p-2 text-xs">{r.fechaProximoRetest ? new Date(r.fechaProximoRetest).toLocaleDateString() : '—'}</td></tr>)}</tbody>
          </table>
        )

      case 'mantenimiento':
        const mantenimientos = data.flatMap((cyl: any) => (cyl.mantenimientos || []).map((m: any) => ({ ...m, serie: cyl.numeroSerie, gas: cyl.gas?.nombre })))
        return (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-100">{['Serie', 'Gas', 'Tipo', 'Fecha', 'Técnico', 'Observaciones'].map(h => <th key={h} className="border p-2 text-left text-xs font-semibold">{h}</th>)}</tr></thead>
            <tbody>{mantenimientos.length === 0 ? <tr><td colSpan={6} className="text-center text-slate-400 p-4">Sin mantenimientos registrados</td></tr> : mantenimientos.map((r: any, i: number) => <tr key={r.id || i} className="even:bg-slate-50"><td className="border p-2 font-mono text-xs">{r.serie}</td><td className="border p-2">{r.gas || '—'}</td><td className="border p-2">{r.tipo}</td><td className="border p-2 text-xs">{r.fecha ? new Date(r.fecha).toLocaleDateString() : '—'}</td><td className="border p-2">{r.tecnico || '—'}</td><td className="border p-2 text-xs">{r.observaciones || '—'}</td></tr>)}</tbody>
          </table>
        )

      case 'rutas':
        return (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-100">{['Nombre', 'Fecha', 'Estado', 'Paradas', 'Distancia (km)', 'Duración (hs)'].map(h => <th key={h} className="border p-2 text-left text-xs font-semibold">{h}</th>)}</tr></thead>
            <tbody>{data.map((r: any, i: number) => <tr key={r.id || i} className="even:bg-slate-50"><td className="border p-2 font-medium">{r.nombre}</td><td className="border p-2 text-xs">{r.fecha ? new Date(r.fecha).toLocaleDateString() : '—'}</td><td className="border p-2">{r.estado}</td><td className="border p-2 text-center">{r.paradas?.length || 0}</td><td className="border p-2 text-right">{r.distanciaKm ?? '—'}</td><td className="border p-2 text-right">{r.duracionHoras ?? '—'}</td></tr>)}</tbody>
          </table>
        )

      case 'catalogo':
        return (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-100">{['Código', 'Nombre', 'Color', 'Presión (Bar)', 'Categoría', 'Peligro'].map(h => <th key={h} className="border p-2 text-left text-xs font-semibold">{h}</th>)}</tr></thead>
            <tbody>{data.map((r: any, i: number) => <tr key={r.id || i} className="even:bg-slate-50"><td className="border p-2 font-mono text-xs font-semibold">{r.codigo}</td><td className="border p-2">{r.nombre}</td><td className="border p-2"><span className="inline-block w-4 h-4 rounded border align-middle mr-1" style={{ background: r.colorHex }} />{r.colorHex}</td><td className="border p-2 text-right">{r.presionBar}</td><td className="border p-2">{r.categoria}</td><td className="border p-2">{r.peligro}</td></tr>)}</tbody>
          </table>
        )

      case 'pedidos':
        return (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-100">{['N°', 'Cliente', 'Fecha', 'Estado', 'Cilindros', 'Total'].map(h => <th key={h} className="border p-2 text-left text-xs font-semibold">{h}</th>)}</tr></thead>
            <tbody>{data.map((r: any, i: number) => <tr key={r.id || i} className="even:bg-slate-50"><td className="border p-2 font-mono text-xs">{r.numero || i + 1}</td><td className="border p-2">{r.clienteNombre || r.clienteId}</td><td className="border p-2 text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td><td className="border p-2">{r.estado}</td><td className="border p-2 text-center">{r.cilindros?.length || 0}</td><td className="border p-2 text-right">${r.total?.toFixed(2) || '—'}</td></tr>)}</tbody>
          </table>
        )

      case 'facturacion':
        return (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-slate-100">{['N° Factura', 'Cliente', 'Período', 'Subtotal', 'Total', 'Fecha'].map(h => <th key={h} className="border p-2 text-left text-xs font-semibold">{h}</th>)}</tr></thead>
            <tbody>{data.map((r: any, i: number) => <tr key={r.id || i} className="even:bg-slate-50"><td className="border p-2 font-mono text-xs">{r.numero || r.id?.slice(0, 8)}</td><td className="border p-2">{r.clienteNombre || r.clienteId}</td><td className="border p-2 text-xs">{r.fechaDesde ? `${new Date(r.fechaDesde).toLocaleDateString()} - ${new Date(r.fechaHasta).toLocaleDateString()}` : '—'}</td><td className="border p-2 text-right">${(r.subtotal ?? 0).toFixed(2)}</td><td className="border p-2 text-right font-semibold">${(r.totalGeneral ?? 0).toFixed(2)}</td><td className="border p-2 text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td></tr>)}</tbody>
          </table>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-500" />
        Reportes
      </h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b pb-1 flex-wrap">
        {REPORTES.map((r) => (
          <button
            key={r.key}
            onClick={() => setActiveReporte(r.key)}
            className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors ${activeReporte === r.key ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Print button (hidden when printing) */}
      <div className="flex justify-end no-print">
        <Button onClick={printReport} className="bg-blue-500 hover:bg-blue-600 gap-2">
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
      </div>

      {/* A4 Report */}
      <div ref={printRef} className="print-area bg-white rounded-lg border shadow-sm">
        {loading ? (
          <div className="p-8 space-y-3">{['h-8', 'h-4', 'h-48'].map((h, i) => <Skeleton key={i} className={`${h} w-full`} />)}</div>
        ) : (
          <div className="p-6 sm:p-8">
            {/* Header: title + date/page info */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-800">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Control Digital ManejaDatos</h1>
                <p className="text-base font-semibold text-slate-700 mt-1">
                  Reporte de {REPORTES.find((r) => r.key === activeReporte)?.label}
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-500 leading-relaxed">
                <div>Fecha: {fechaHora}</div>
                <div>Pág. 1</div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {renderTable()}
            </div>

            {/* Footer */}
            <div className="mt-8 pt-3 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between">
              <span>Impreso por: {userName || 'Usuario'}</span>
              <span>{fechaHora}</span>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-area { border: none !important; box-shadow: none !important; margin: 0 !important; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  )
}
