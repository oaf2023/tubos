'use client'

import { useEffect, useState } from 'react'
import { Wrench, Trash2, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { Cylinder, Gas } from '@/lib/tab-types'
import { formatDate } from '@/lib/tab-constants'

const TIPOS_MANT: Record<string, string> = {
  CAMBIO_VALVULA: 'Cambio Válvula',
  PINTURA: 'Pintura',
  CAMBIO_GAS: 'Cambio Gas',
  REPARACION: 'Reparación',
  INSPECCION: 'Inspección',
  OTRO: 'Otro',
}

export default function MantenimientoTab() {
  const { toast } = useToast()
  const [records, setRecords] = useState<any[]>([])
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCylinder, setFiltroCylinder] = useState('all')
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [filtroGas, setFiltroGas] = useState('all')
  const [gases, setGases] = useState<Gas[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    cylinderId: '', tipo: '', descripcion: '', tecnico: '',
    costo: '', fecha: new Date().toISOString().split('T')[0],
  })

  async function loadData() {
    setLoading(true)
    try {
      const [cylRes, gasRes] = await Promise.all([
        fetch('/api/cylinders'),
        fetch('/api/gases'),
      ])
      const cyls: Cylinder[] = await cylRes.json()
      const allRecords: any[] = []
      for (const cyl of cyls) {
        const mRes = await fetch(`/api/cylinders/${cyl.id}/mantenimiento`)
        const mData = await mRes.json()
        if (Array.isArray(mData)) {
          for (const r of mData) allRecords.push({ ...r, cylinder: cyl })
        }
      }
      allRecords.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      setRecords(allRecords)
      setCylinders(cyls)
      setGases(await gasRes.json())
    } catch { setRecords([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const filtered = records.filter(r => {
    if (filtroCylinder !== 'all' && r.cylinderId !== filtroCylinder) return false
    if (filtroTipo !== 'all' && r.tipo !== filtroTipo) return false
    if (filtroGas !== 'all' && r.cylinder.gasId !== filtroGas) return false
    return true
  })

  async function saveMantenimiento() {
    if (!form.cylinderId || !form.tipo) return
    try {
      const res = await fetch(`/api/cylinders/${form.cylinderId}/mantenimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Mantenimiento registrado', variant: 'default' })
      setDialogOpen(false)
      setForm({ cylinderId: '', tipo: '', descripcion: '', tecnico: '', costo: '', fecha: new Date().toISOString().split('T')[0] })
      loadData()
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    }
  }

  async function deleteMantenimiento(mantId: string, cylinderId: string) {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return
    try {
      const res = await fetch(`/api/cylinders/${cylinderId}/mantenimiento?mantenimientoId=${mantId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Registro eliminado', variant: 'default' })
      loadData()
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-500" />
          Mantenimiento de Tubos
        </h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-to-r from-orange-500 to-red-600 gap-2">
          <Wrench className="w-4 h-4" /> Nuevo Registro
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={filtroCylinder} onValueChange={setFiltroCylinder}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Todos los tubos" /></SelectTrigger>
          <SelectContent>{cylinders.map(cyl => <SelectItem key={cyl.id} value={cyl.id}>{cyl.numeroSerie} — {cyl.gas.nombre}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(TIPOS_MANT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroGas} onValueChange={setFiltroGas}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Todos los gases" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los gases</SelectItem>
            {gases.map(g => <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Sin registros de mantenimiento</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tubo</TableHead>
                <TableHead>Gas</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-center w-16">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs font-mono">{formatDate(r.fecha)}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold">{r.cylinder.numeroSerie}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: r.cylinder.gas.colorHex }} />
                      <span className="text-xs">{r.cylinder.gas.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{TIPOS_MANT[r.tipo] || r.tipo}</Badge></TableCell>
                  <TableCell className="text-xs max-w-48 truncate">{r.descripcion || '—'}</TableCell>
                  <TableCell className="text-xs">{r.tecnico || '—'}</TableCell>
                  <TableCell className="text-right text-xs font-mono tabular-nums">{r.costo != null ? `$${r.costo.toFixed(2)}` : '—'}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                      onClick={() => deleteMantenimiento(r.id, r.cylinderId)} title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: Nuevo mantenimiento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" />
              Nuevo Registro de Mantenimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tubo</Label>
              <Select value={form.cylinderId} onValueChange={v => setForm(f => ({ ...f, cylinderId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tubo" /></SelectTrigger>
                <SelectContent>
                  {cylinders.map(cyl => (
                    <SelectItem key={cyl.id} value={cyl.id}>{cyl.numeroSerie} — {cyl.gas.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOS_MANT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Técnico</Label>
                <Input value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} placeholder="Nombre" />
              </div>
              <div>
                <Label>Costo ($)</Label>
                <Input type="number" step="0.01" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
            <Button onClick={saveMantenimiento} disabled={!form.cylinderId || !form.tipo}
              className="bg-gradient-to-r from-orange-500 to-red-600">
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
