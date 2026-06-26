'use client'

import { CircleHelp } from 'lucide-react'

export default function HeaderHelp() {
  return (
    <button
      onClick={() => window.open('/Usuario.html', '_blank')}
      className="text-slate-400 hover:text-orange-500 transition-colors"
      title="Manual de usuario"
    >
      <CircleHelp className="w-4 h-4" />
    </button>
  )
}
