'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Folder, File, ArrowUp, FolderOpen, ChevronRight, X,
} from 'lucide-react'

interface FsEntry {
  name: string
  kind: 'file' | 'directory'
  fileHandle?: FileSystemFileHandle
  dirHandle?: FileSystemDirectoryHandle
  fileObj?: File
}

interface DirState {
  name: string
  dirHandle: FileSystemDirectoryHandle | null
  entries: FsEntry[]
}

const TEXT_EXTS = /\.(txt|md|json|csv|xml|html?|css|js|ts|jsx|tsx|py|rb|java|[ch]pp?|go|rs|sh|bat|ps1|ya?ml|toml|ini|cfg|log|env|sql|svg|php|rb|ex|exs)$/i

function isTextFile(name: string): boolean {
  return TEXT_EXTS.test(name)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function Explorador() {
  const [stack, setStack] = useState<DirState[]>([{ name: '', dirHandle: null, entries: [] }])
  const [selected, setSelected] = useState<FsEntry | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = stack[stack.length - 1]
  const pathStr = stack.slice(1).map(d => d.name).join(' / ')

  const readDir = async (dh: FileSystemDirectoryHandle): Promise<FsEntry[]> => {
    const items: FsEntry[] = []
    for await (const [name, h] of (dh as any).entries()) {
      items.push({
        name,
        kind: h.kind as 'file' | 'directory',
        ...(h.kind === 'directory'
          ? { dirHandle: h as FileSystemDirectoryHandle }
          : { fileHandle: h as FileSystemFileHandle }),
      })
    }
    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return items
  }

  const openDir = useCallback(async () => {
    try {
      setLoading(true)
      if ('showDirectoryPicker' in window) {
        const dh = await (window as any).showDirectoryPicker() as FileSystemDirectoryHandle
        const entries = await readDir(dh)
        setStack([{ name: dh.name, dirHandle: dh, entries }])
      } else {
        inputRef.current?.click()
      }
      setSelected(null)
      setContent(null)
    } catch (err: any) {
      if (err?.name !== 'AbortError' && err?.name !== 'SecurityError') {
        console.error(err)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const goInto = async (entry: FsEntry) => {
    if (entry.kind !== 'directory' || !entry.dirHandle) return
    setLoading(true)
    try {
      const entries = await readDir(entry.dirHandle)
      setStack(prev => [...prev, { name: entry.name, dirHandle: entry.dirHandle!, entries }])
      setSelected(null)
      setContent(null)
    } finally {
      setLoading(false)
    }
  }

  const goUp = () => {
    if (stack.length <= 1) return
    setStack(prev => prev.slice(0, -1))
    setSelected(null)
    setContent(null)
  }

  const viewFile = async (entry: FsEntry) => {
    if (entry.kind !== 'file') return
    setSelected(entry)
    if (!isTextFile(entry.name)) {
      setContent('')
      return
    }
    setContent(null)
    try {
      let text: string
      if (entry.fileHandle) {
        const file = await entry.fileHandle.getFile()
        text = await file.text()
      } else if (entry.fileObj) {
        text = await entry.fileObj.text()
      } else {
        text = ''
      }
      setContent(text)
    } catch {
      setContent('')
    }
  }

  const handleFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setLoading(true)
    const entries: FsEntry[] = []
    const dirName = (files[0] as any).webkitRelativePath?.split('/')[0] || 'Archivos'
    for (const f of files) {
      const displayName = (f as any).webkitRelativePath
        ? (f as any).webkitRelativePath.split('/').slice(1).join('/') || f.name
        : f.name
      entries.push({ name: displayName, kind: 'file', fileObj: f })
    }
    entries.sort((a, b) => a.name.localeCompare(b.name))
    setStack([{ name: dirName, dirHandle: null, entries }])
    setSelected(null)
    setContent(null)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
        <span className="animate-pulse">Cargando...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3 min-h-[200px] flex flex-col">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFallback}
        // @ts-ignore - webkitdirectory is not in TS types
        webkitdirectory=""
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={openDir}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors active:scale-95 touch-manipulation"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Abrir carpeta
        </button>
        {current.name && (
          <span className="text-xs text-slate-400 truncate" title={pathStr || current.name}>
            {pathStr || current.name}
          </span>
        )}
      </div>

      {/* Breadcrumb */}
      {stack.length > 1 && (
        <div className="flex items-center gap-1 text-xs text-slate-400 flex-wrap flex-shrink-0">
          {stack.slice(1).map((d, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className="font-medium text-slate-600">{d.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {current.entries.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-400">
            <Folder className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Seleccioná una carpeta para explorar</p>
            <p className="text-xs mt-1 text-slate-300">Usá Ctrl+C para copiar, seleccioná texto con el mouse</p>
          </div>
        ) : (
          <div className="grid gap-3 h-full" style={selected ? { gridTemplateColumns: '1fr 1fr' } : {}}>
            {/* File list */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="max-h-[280px] overflow-y-auto">
                {stack.length > 1 && (
                  <button
                    onClick={goUp}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 border-b border-slate-100 transition-colors active:scale-[0.99] touch-manipulation"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    ..
                  </button>
                )}
                {current.entries.map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => entry.kind === 'directory' ? goInto(entry) : viewFile(entry)}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors border-b border-slate-50 last:border-0 active:scale-[0.99] touch-manipulation ${
                      selected === entry ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {entry.kind === 'directory' ? (
                      <Folder className="w-4 h-4 flex-shrink-0 text-amber-500" />
                    ) : (
                      <File className="w-4 h-4 flex-shrink-0 text-slate-400" />
                    )}
                    <span className="truncate flex-1">{entry.name}</span>
                    {entry.fileObj && (
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{formatSize(entry.fileObj.size)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* File viewer */}
            {selected && (
              <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
                  <span className="text-xs font-medium text-slate-600 truncate">{selected.name}</span>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {content !== null ? (
                  <pre className="p-3 text-xs font-mono leading-relaxed overflow-auto max-h-[260px] whitespace-pre-wrap break-all select-text outline-none cursor-text">
                    {content || '(Vista previa no disponible para este tipo de archivo)'}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center py-8 text-xs text-slate-400">
                    Leyendo archivo...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
