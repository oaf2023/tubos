'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Plus, Image, Video, Mic, FileText, Trash2, Camera, Music, Save } from 'lucide-react'

interface Archivo {
  id?: string
  tipo: string
  nombre: string
  datos: string // base64
}

interface Observacion {
  id: string
  tipo: string
  titulo: string | null
  descripcion: string | null
  audioUrl: string | null
  createdAt: string
  createdBy: string | null
  archivos: Archivo[]
}

export default function ObservacionesTab() {
  const { toast } = useToast()
  const [subtab, setSubtab] = useState('imagenes')
  const [items, setItems] = useState<Observacion[]>([])
  const [loading, setLoading] = useState(true)

  // New observation form
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [grabando, setGrabando] = useState(false)
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Notes (Otras Cosas)
  const [notaTexto, setNotaTexto] = useState('')
  const [notaTitulo, setNotaTitulo] = useState('')

  const [userName, setUserName] = useState('')
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('opencode_user')
      if (saved) setUserName(JSON.parse(saved).nombre || JSON.parse(saved).usuario || '')
    } catch { /* ignore */ }
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/observaciones')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // --- File handling ---
  function handleFile(e: React.ChangeEvent<HTMLInputElement>, tipo: string) {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setArchivos((prev) => [...prev, { tipo, nombre: file.name, datos: reader.result as string }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  // --- Audio recording ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRec = new MediaRecorder(stream)
      mediaRecRef.current = mediaRec
      const chunks: BlobPart[] = []
      mediaRec.ondataavailable = (e) => chunks.push(e.data)
      mediaRec.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
      }
      mediaRec.start()
      setGrabando(true)
    } catch {
      toast({ title: 'No se pudo acceder al micrófono', variant: 'destructive' })
    }
  }

  function stopRecording() {
    mediaRecRef.current?.stop()
    mediaRecRef.current?.stream.getTracks().forEach((t) => t.stop())
    setGrabando(false)
  }

  function archivoToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  }

  // --- Save ---
  async function saveImagen() {
    if (archivos.length === 0 && !descripcion && !audioBlob) {
      toast({ title: 'Agregá al menos un archivo, texto o audio', variant: 'destructive' })
      return
    }
    let audioDataUrl = audioUrl
    if (audioBlob && !audioUrl?.startsWith('data:')) {
      audioDataUrl = await archivoToBase64(audioBlob)
    }
    try {
      const body: any = {
        tipo: 'IMAGEN',
        titulo: titulo || null,
        descripcion: descripcion || null,
        audioUrl: audioDataUrl || null,
        createdBy: userName,
        archivos: archivos.map((a) => ({ tipo: a.tipo, nombre: a.nombre, datos: a.datos })),
      }
      const res = await fetch('/api/observaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Observación guardada' })
      resetForm()
      load()
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    }
  }

  async function saveNota() {
    if (!notaTitulo && !notaTexto && !audioBlob) {
      toast({ title: 'Escribí algo o grabá audio', variant: 'destructive' })
      return
    }
    let audioDataUrl = audioUrl
    if (audioBlob && !audioUrl?.startsWith('data:')) {
      audioDataUrl = await archivoToBase64(audioBlob)
    }
    try {
      const body: any = {
        tipo: 'NOTA',
        titulo: notaTitulo || null,
        descripcion: notaTexto || null,
        audioUrl: audioDataUrl || null,
        createdBy: userName,
      }
      const res = await fetch('/api/observaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Nota guardada' })
      setNotaTitulo('')
      setNotaTexto('')
      setAudioBlob(null)
      setAudioUrl(null)
      load()
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    }
  }

  function resetForm() {
    setTitulo('')
    setDescripcion('')
    setArchivos([])
    setAudioBlob(null)
    setAudioUrl(null)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar?')) return
    try {
      await fetch(`/api/observaciones/${id}`, { method: 'DELETE' })
      toast({ title: 'Eliminada' })
      load()
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const filteredItems = items.filter((i) => subtab === 'imagenes' ? ['IMAGEN', 'VIDEO'].includes(i.tipo) : ['NOTA', 'AUDIO'].includes(i.tipo))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5 text-emerald-500" />
        Observaciones
      </h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b pb-1">
        <button onClick={() => setSubtab('imagenes')} className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${subtab === 'imagenes' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-800'}`}>
          <Image className="w-4 h-4 inline mr-1" /> Imágenes
        </button>
        <button onClick={() => setSubtab('otras')} className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${subtab === 'otras' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-800'}`}>
          <FileText className="w-4 h-4 inline mr-1" /> Otras Cosas
        </button>
      </div>

      {/* IMAGENES */}
      {subtab === 'imagenes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Nueva observación
            </h3>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label className="text-xs">Descripción</Label>
              <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Texto, detalle..." rows={3} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
                <Camera className="w-4 h-4" /> Imagen
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e, 'IMAGE')} />
              <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} className="gap-1">
                <Video className="w-4 h-4" /> Video
              </Button>
              <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => handleFile(e, 'VIDEO')} />
              <Button variant={grabando ? 'destructive' : 'outline'} size="sm" onClick={grabando ? stopRecording : startRecording} className="gap-1">
                <Mic className="w-4 h-4" /> {grabando ? 'Detener' : 'Audio'}
              </Button>
            </div>
            {archivos.length > 0 && (
              <div className="space-y-1">
                {archivos.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-1.5 rounded">
                    {a.tipo === 'IMAGE' ? <Image className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    <span className="truncate flex-1">{a.nombre}</span>
                    <button onClick={() => setArchivos((p) => p.filter((_, j) => j !== i))}><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                ))}
              </div>
            )}
            {audioUrl && (
              <div className="space-y-1">
                <audio controls src={audioUrl} className="w-full h-8" />
                <button onClick={() => { setAudioBlob(null); setAudioUrl(null) }} className="text-xs text-red-500">Eliminar audio</button>
              </div>
            )}
            <Button onClick={saveImagen} className="w-full bg-emerald-500 hover:bg-emerald-600 gap-2">
              <Save className="w-4 h-4" /> Guardar
            </Button>
          </Card>

          {/* List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : filteredItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sin imágenes aún</p>
              ) : filteredItems.map((item) => (
                <Card key={item.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.titulo || 'Sin título'}</p>
                      <p className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()} {item.createdBy ? `- ${item.createdBy}` : ''}</p>
                    </div>
                    <button onClick={() => eliminar(item.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                  {item.descripcion && <p className="text-xs text-slate-600">{item.descripcion}</p>}
                  <div className="flex gap-2 flex-wrap">
                    {item.archivos.map((a) => (
                      a.tipo === 'IMAGE'
                        ? <img key={a.id} src={a.datos} alt={a.nombre} className="w-20 h-20 object-cover rounded border" />
                        : <video key={a.id} src={a.datos} className="w-20 h-20 object-cover rounded border" controls />
                    ))}
                    {item.audioUrl && <audio controls src={item.audioUrl} className="w-full h-8" />}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* OTRAS COSAS */}
      {subtab === 'otras' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Nueva nota
            </h3>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={notaTitulo} onChange={(e) => setNotaTitulo(e.target.value)} placeholder="Asunto" />
            </div>
            <div>
              <Label className="text-xs">Texto</Label>
              <Textarea value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)} placeholder="Escribí tu nota aquí..." rows={4} />
            </div>
            <div className="flex gap-2">
              <Button variant={grabando ? 'destructive' : 'outline'} size="sm" onClick={grabando ? stopRecording : startRecording} className="gap-1">
                <Mic className="w-4 h-4" /> {grabando ? 'Detener' : 'Grabar audio'}
              </Button>
            </div>
            {audioUrl && (
              <div className="space-y-1">
                <audio controls src={audioUrl} className="w-full h-8" />
                <button onClick={() => { setAudioBlob(null); setAudioUrl(null) }} className="text-xs text-red-500">Eliminar audio</button>
              </div>
            )}
            <Button onClick={saveNota} className="w-full bg-emerald-500 hover:bg-emerald-600 gap-2">
              <Save className="w-4 h-4" /> Guardar nota
            </Button>
          </Card>

          {/* List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {loading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : filteredItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sin notas aún</p>
              ) : filteredItems.map((item) => (
                <Card key={item.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.titulo || 'Sin título'}</p>
                      <p className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()} {item.createdBy ? `- ${item.createdBy}` : ''}</p>
                    </div>
                    <button onClick={() => eliminar(item.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                  {item.descripcion && <p className="text-xs text-slate-600 whitespace-pre-wrap">{item.descripcion}</p>}
                  {item.audioUrl && <audio controls src={item.audioUrl} className="w-full h-8" />}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className || ''}`} />
}
