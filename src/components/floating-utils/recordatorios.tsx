'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Check, Clock, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'util_recordatorios'

interface Todo {
  id: string
  text: string
  done: boolean
  createdAt: string
}

export default function Recordatorios() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newText, setNewText] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setTodos(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const persist = useCallback((next: Todo[]) => {
    setTodos(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const addTodo = () => {
    const t = newText.trim()
    if (!t) return
    const todo: Todo = { id: crypto.randomUUID(), text: t, done: false, createdAt: new Date().toISOString() }
    persist([todo, ...todos])
    setNewText('')
  }

  const toggleTodo = (id: string) => {
    persist(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTodo = (id: string) => {
    persist(todos.filter(t => t.id !== id))
  }

  const clearDone = () => {
    persist(todos.filter(t => !t.done))
  }

  const filtered = todos.filter(t => {
    if (filter === 'pending') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  const pendingCount = todos.filter(t => !t.done).length
  const doneCount = todos.filter(t => t.done).length

  const filterBtn = (key: 'all' | 'pending' | 'done', label: string, count: number) => (
    <button
      onClick={() => setFilter(key)}
      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        filter === key ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      {label} ({count})
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Add new */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Nuevo recordatorio..."
            className="text-sm pr-8"
            onKeyDown={e => e.key === 'Enter' && addTodo()}
          />
          {newText.trim() && (
            <button onClick={addTodo} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-600">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {filterBtn('all', 'Todas', todos.length)}
        {filterBtn('pending', 'Pendientes', pendingCount)}
        {filterBtn('done', 'Completadas', doneCount)}
      </div>

      {/* List */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{filter === 'all' ? 'Sin recordatorios' : filter === 'pending' ? 'Todo completado 🎉' : 'Nada completado aún'}</p>
          </div>
        ) : (
          filtered.map(todo => (
            <div
              key={todo.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group ${
                todo.done ? 'bg-green-50 opacity-70' : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  todo.done ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-amber-400'
                }`}
              >
                {todo.done && <Check className="w-3 h-3" />}
              </button>
              <span className={`flex-1 text-sm truncate ${todo.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-slate-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {doneCount > 0 && (
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {pendingCount} pendientes
          </span>
          <button onClick={clearDone} className="text-red-400 hover:text-red-600 hover:underline">
            Limpiar completadas
          </button>
        </div>
      )}
    </div>
  )
}
