'use client'

import { useEffect, useState } from 'react'
import {
  Search, Trash2, X, Save, Plus, Pencil, ArrowUpDown,
  RefreshCw, FileDown, ChevronLeft, ChevronRight, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { Articulo } from '@/lib/tab-types'

type SortField = 'ART_CODI' | 'ART_DET1' | 'ART_PRE1' | 'ART_COST' | 'ART_STIN'
type SortDir = 'asc' | 'desc'

const FIELDS: { key: keyof Articulo; label: string; type?: string; section?: string }[] = [
  { key: 'ART_CODI', label: 'Código' },
  { key: 'ART_DET1', label: 'Descripción' },
  { key: 'ART_COD1', label: 'Cod. Alterno 1' },
  { key: 'ART_COD2', label: 'Cod. Alterno 2' },
  { key: 'ART_COD3', label: 'Cod. Alterno 3' },
  { key: 'ART_PRE1', label: 'Precio 1', type: 'number' },
  { key: 'ART_PRE2', label: 'Precio 2', type: 'number' },
  { key: 'ART_PRE3', label: 'Precio 3', type: 'number' },
  { key: 'ART_PRE4', label: 'Precio 4', type: 'number' },
  { key: 'ART_COST', label: 'Costo', type: 'number' },
  { key: 'ART_STIN', label: 'Stock Ideal', type: 'number' },
  { key: 'ART_SMIN', label: 'Stock Mínimo', type: 'number' },
  { key: 'ART_SMAX', label: 'Stock Máximo', type: 'number' },
  { key: 'ART_UNID', label: 'Unidad' },
  { key: 'ART_TIVA', label: 'Tipo IVA', type: 'number' },
  { key: 'ART_MARC', label: 'Marca', type: 'number' },
  { key: 'ART_RUBR', label: 'Rubro', type: 'number' },
  { key: 'ART_SUBR', label: 'Subrubro', type: 'number' },
  { key: 'ART_DPTO', label: 'Depto', type: 'number' },
  { key: 'ART_DTO1', label: 'Dto. 1', type: 'number' },
  { key: 'ART_DTO2', label: 'Dto. 2', type: 'number' },
  { key: 'ART_DTO3', label: 'Dto. 3', type: 'number' },
  { key: 'ART_DTOG', label: 'Dto. General', type: 'number' },
  { key: 'ART_LIST', label: 'Lista', type: 'number' },
  { key: 'ART_OFER', label: 'Oferta', type: 'number' },
  { key: 'ART_POFE', label: 'Precio Oferta', type: 'number' },
  { key: 'ART_FLET', label: 'Flete', type: 'number' },
  { key: 'ART_OBS', label: 'Observaciones' },
]

const TABLE_COLS: { key: keyof Articulo; label: string }[] = [
  { key: 'ART_CODI', label: 'Código' },
  { key: 'ART_DET1', label: 'Descripción' },
  { key: 'ART_COD1', label: 'Cod.1' },
  { key: 'ART_COD2', label: 'Cod.2' },
  { key: 'ART_PRE1', label: 'Precio' },
  { key: 'ART_COST', label: 'Costo' },
  { key: 'ART_STIN', label: 'Stk' },
  { key: 'ART_UNID', label: 'Ud.' },
]

const SORTABLE: SortField[] = ['ART_CODI', 'ART_DET1', 'ART_PRE1', 'ART_COST', 'ART_STIN']

export default function ArticulosTab() {
  const { toast } = useToast()
  const [records, setRecords] = useState<Articulo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<SortField>('ART_CODI')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Partial<Articulo>>({})
  const [saving, setSaving] = useState(false)
  const perPage = 30

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort_by: sortBy,
        sort_dir: sortDir,
      })
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/articulos?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setRecords(json.data || [])
      setTotal(json.total || 0)
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los artículos', variant: 'destructive' })
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [page, sortBy, sortDir])

  const handleSearch = () => { setPage(1); loadData() }

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  const openCreate = () => {
    setEditingId(null)
    const maxCodi = records.reduce((max, r) => Math.max(max, r.ART_CODI || 0), 0)
    setForm({ ART_CODI: maxCodi + 1, ART_DET1: '', ART_UNID: 'UN' })
    setDialogOpen(true)
  }

  const openEdit = (r: Articulo) => {
    setEditingId(r.ART_CODI)
    setForm({ ...r })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.ART_DET1?.trim()) {
      toast({ title: 'Validación', description: 'La descripción es obligatoria', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/articulos/${editingId}` : '/api/articulos'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      toast({ title: editingId ? 'Actualizado' : 'Creado', description: 'Artículo guardado correctamente' })
      setDialogOpen(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteRecord = async (id: number) => {
    try {
      const res = await fetch(`/api/articulos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }
      toast({ title: 'Eliminado', description: 'Artículo eliminado correctamente' })
      setDeleteConfirm(null)
      loadData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const exportCsv = async () => {
    try {
      const res = await fetch('/api/articulos/export/csv')
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'articulos.csv'; a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Exportado', description: 'CSV descargado' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo exportar', variant: 'destructive' })
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Inventario Artículos</h2>
          <Badge variant="outline" className="text-xs">{total} registros</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileDown className="w-4 h-4 mr-1" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setPage(1); loadData() }}>
            <RefreshCw className="w-4 h-4 mr-1" />Refrescar
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />Nuevo Artículo
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por código, descripción o código alterno..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="secondary" size="sm" onClick={handleSearch}>
          <Search className="w-4 h-4 mr-1" />Buscar
        </Button>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); setTimeout(loadData, 0) }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {TABLE_COLS.map(col => {
                const isSortable = SORTABLE.includes(col.key as SortField)
                return (
                  <TableHead
                    key={col.key}
                    className={isSortable ? 'cursor-pointer select-none' : ''}
                    onClick={isSortable ? () => toggleSort(col.key as SortField) : undefined}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {isSortable && (
                        <ArrowUpDown className={`w-3 h-3 ${sortBy === col.key ? 'text-blue-600' : 'text-slate-300'}`} />
                      )}
                    </span>
                  </TableHead>
                )
              })}
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {TABLE_COLS.map(col => (
                    <TableCell key={col.key}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={TABLE_COLS.length + 1} className="text-center py-8 text-slate-500">
                  {search ? 'Sin resultados para la búsqueda' : 'No hay artículos cargados'}
                </TableCell>
              </TableRow>
            ) : (
              records.map(r => (
                <TableRow key={r.ART_CODI}>
                  <TableCell className="font-mono text-xs">{r.ART_CODI}</TableCell>
                  <TableCell className="max-w-xs truncate">{r.ART_DET1}</TableCell>
                  <TableCell className="text-xs text-slate-500">{r.ART_COD1 || '-'}</TableCell>
                  <TableCell className="text-xs text-slate-500">{r.ART_COD2 || '-'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {r.ART_PRE1 != null ? `$${Number(r.ART_PRE1).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {r.ART_COST != null ? `$${Number(r.ART_COST).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">{r.ART_STIN ?? '-'}</TableCell>
                  <TableCell>{r.ART_UNID || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(r)}>
                        <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setDeleteConfirm(r.ART_CODI)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Página {page} de {totalPages} ({total} registros)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="w-4 h-4 mr-1" />Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Siguiente<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Artículo' : 'Nuevo Artículo'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input
                  className="h-8 text-sm"
                  type={f.type === 'number' ? 'number' : 'text'}
                  step={f.type === 'number' ? '0.01' : undefined}
                  value={form[f.key] ?? ''}
                  onChange={e => {
                    const val = e.target.value
                    setForm(prev => ({
                      ...prev,
                      [f.key]: f.type === 'number' ? (val === '' ? null : Number(val)) : val,
                    }))
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="w-4 h-4 mr-1" />Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm != null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">¿Eliminar el artículo código <strong>{deleteConfirm}</strong>? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              <X className="w-4 h-4 mr-1" />Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteRecord(deleteConfirm)}>
              <Trash2 className="w-4 h-4 mr-1" />Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
