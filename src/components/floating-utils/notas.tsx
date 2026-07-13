'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, Download, Clock } from 'lucide-react'

const STORAGE_KEY = 'util_bloc_notas'
const AUTOSAVE_MS = 3000

export default function BlocNotas() {
  const [text, setText] = useState('')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setText(saved)
        setLastSaved('Cargado')
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
  }, [text])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, text)
        setLastSaved(new Date().toLocaleTimeString())
      } catch { /* ignore */ }
    }, AUTOSAVE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [text])

  const clearNotes = () => {
    if (text && !confirm('¿Borrar todas las notas?')) return
    setText('')
    localStorage.removeItem(STORAGE_KEY)
    setLastSaved('Borrado')
    if (textareaRef.current) textareaRef.current.focus()
  }

  const exportNotes = () => {
    const blob = new Blob([text || '(vacío)'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notas-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const insertDate = () => {
    const d = new Date().toLocaleString('es-AR')
    setText(t => t + (t ? '\n' : '') + `[${d}] `)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {lastSaved ? `Guardado: ${lastSaved}` : 'Sin guardar'}
          <span className="ml-2 font-mono">{wordCount} palabras</span>
        </div>
        <div className="flex gap-1">
          <button onClick={insertDate} className="px-2 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200 transition-colors">📅 Fecha</button>
          <button onClick={exportNotes} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors" title="Exportar">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={clearNotes} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors" title="Borrar todo">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        className="w-full min-h-[250px] sm:min-h-[300px] rounded-xl border border-slate-200 p-4 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
        placeholder="Escribí tus notas aquí... se guardan automáticamente."
        autoFocus
      />
    </div>
  )
}
