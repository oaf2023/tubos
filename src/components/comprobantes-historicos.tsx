'use client'

import { useEffect, useState } from 'react'
import { Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/tab-constants'

interface ItemHistorico {
  id: string
  codigoProducto: string | null
  descripcion: string
  cantidad: number
  precioUnitario: number
  descuento: number
  subtotal: number
  alicuotaIva: number
  importeIva: number
}

interface ComprobanteHistorico {
  id: string
  fecha: string
  fechaVto: string | null
  tipo: string
  letra: string | null
  puntoVenta: string | null
  numero: string | null
  cbteCompleto: string
  clienteId: string | null
  clienteNombre: string
  clienteDoc: string | null
  netoGravado: number
  netoExento: number
  iva21: number
  iva105: number
  iva27: number
  percepcionIibb: number
  total: number
  vendedorNombre: string | null
  items?: ItemHistorico[]
  _count?: { items: number }
}

export default function ComprobantesHistoricos() {
  const [data, setData] = useState<ComprobanteHistorico[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState('all')
  const [search, setSearch] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [detail, setDetail] = useState<ComprobanteHistorico | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const TIPOS = ['all', 'Factura', 'Nota Débito', 'Nota Crédito', 'Pedido', 'Remito', 'Recibo', 'Presupuesto']

  const limit = 50

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (tipo !== 'all') params.set('tipo', tipo)
      if (search) params.set('search', search)
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      const res = await fetch(`/api/comprobantes-historicos?${params}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json.data || [])
      setTotal(json.total || 0)
      setPages(json.pages || 0)
    } catch (e) {
      console.error('Error loading comprobantes', e)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [page, tipo])

  function handleSearch() {
    setPage(1)
    load()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  async function openDetail(c: ComprobanteHistorico) {
    if (c.items) { setDetail(c); return }
    setLoadingDetail(true)
    setDetail({ ...c, items: [] })
    try {
      const res = await fetch(`/api/comprobantes-historicos/${c.id}`)
      const json = await res.json()
      setDetail(json)
    } catch (e) {
      console.error(e)
    }
    setLoadingDetail(false)
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t === 'all' ? 'Todos los tipos' : t}
            </option>
          ))}
        </select>
        <Input
          className="w-48"
          placeholder="Buscar cliente o comprobante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Input type="date" className="w-36 text-sm" value={desde} onChange={(e) => setDesde(e.target.value)} placeholder="Desde" />
        <Input type="date" className="w-36 text-sm" value={hasta} onChange={(e) => setHasta(e.target.value)} placeholder="Hasta" />
        <Button variant="secondary" size="sm" onClick={handleSearch}>
          <Search className="w-3.5 h-3.5 mr-1" /> Filtrar
        </Button>
        <span className="text-xs text-slate-400 ml-auto">{total} comprobantes</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-2 text-slate-200" />
          No hay comprobantes históricos
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Neto Grav.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead>Vendedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c)}>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(c.fecha)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.cbteCompleto}</TableCell>
                  <TableCell className="max-w-40 truncate text-sm">{c.clienteNombre}</TableCell>
                  <TableCell className="font-mono text-right text-xs">
                    ${Number(c.netoGravado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-mono text-right text-sm font-medium">
                    ${Number(c.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center text-xs text-slate-500">
                    {c._count?.items || 0}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{c.vendedorNombre || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>Página {page} de {pages} ({total} resultados)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
              Siguiente <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {loadingDetail ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-orange-500" />
                  {detail.cbteCompleto}
                </DialogTitle>
              </DialogHeader>

              {/* Header info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-lg p-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Cliente</span>
                  <span className="font-medium">{detail.clienteNombre}</span>
                  {detail.clienteDoc && <span className="text-xs text-slate-400 block">{detail.clienteDoc}</span>}
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Fecha</span>
                  <span className="font-medium">{formatDate(detail.fecha)}</span>
                  {detail.fechaVto && <span className="text-xs text-slate-400 block">Vto: {formatDate(detail.fechaVto)}</span>}
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Vendedor</span>
                  <span className="font-medium">{detail.vendedorNombre || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Total</span>
                  <span className="font-bold text-lg">${Number(detail.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Tax breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div className="bg-white rounded-lg border p-3 text-center">
                  <div className="text-slate-400">Neto Gravado</div>
                  <div className="font-semibold">${Number(detail.netoGravado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <div className="text-slate-400">Neto Exento</div>
                  <div className="font-semibold">${Number(detail.netoExento).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <div className="text-slate-400">IVA 21%</div>
                  <div className="font-semibold">${Number(detail.iva21).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <div className="text-slate-400">IVA 10.5%</div>
                  <div className="font-semibold">${Number(detail.iva105).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white rounded-lg border p-3 text-center">
                  <div className="text-slate-400">IIBB</div>
                  <div className="font-semibold">${Number(detail.percepcionIibb).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              {/* Items */}
              {detail.items && detail.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Items ({detail.items.length})
                  </h4>
                  <div className="overflow-x-auto rounded-lg border max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">P. Unit.</TableHead>
                          <TableHead className="text-right">Dto.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">IVA%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.items.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell className="font-mono text-xs">{it.codigoProducto || '-'}</TableCell>
                            <TableCell className="max-w-48 truncate text-xs">{it.descripcion}</TableCell>
                            <TableCell className="text-right text-xs">{Number(it.cantidad).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs">${Number(it.precioUnitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-xs">${Number(it.descuento).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-xs font-medium">${Number(it.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-xs">{Number(it.alicuotaIva).toFixed(2)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
