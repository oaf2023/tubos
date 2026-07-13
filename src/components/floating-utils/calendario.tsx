'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Calendario() {
  const today = useMemo(() => new Date(), [])
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const isSelected = (d: number) =>
    selectedDate && d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()

  const goToToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(today)
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="text-center">
          <div className="font-semibold text-sm">{MONTHS[month]} {year}</div>
          {selectedDate && (
            <div className="text-xs text-amber-600 font-medium">
              {formatDate(selectedDate)}
            </div>
          )}
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-xs font-medium text-slate-400 py-1">{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {cells.map((d, i) => (
          <div key={i} className="aspect-square flex items-center justify-center">
            {d && (
              <button
                onClick={() => setSelectedDate(new Date(year, month, d))}
                className={`w-9 h-9 rounded-full text-sm font-medium transition-all active:scale-90 ${
                  isSelected(d)
                    ? 'bg-amber-500 text-white shadow-md'
                    : isToday(d)
                      ? 'bg-amber-100 text-amber-700 font-bold border border-amber-300'
                      : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {d}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Today button */}
      <div className="flex justify-center">
        <button
          onClick={goToToday}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-600 transition-colors"
        >
          <CalendarIcon className="w-4 h-4" />
          Hoy
        </button>
      </div>

      {/* Selected date info */}
      {selectedDate && (
        <div className="bg-slate-50 rounded-xl p-3 text-center text-sm text-slate-600">
          <span className="font-medium">Días desde hoy: </span>
          {Math.round((selectedDate.getTime() - today.getTime()) / 86400000)} días
        </div>
      )}
    </div>
  )
}
