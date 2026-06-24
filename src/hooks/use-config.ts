'use client'

import { useEffect, useState } from 'react'
import type { AppConfig } from '@/lib/config'
import { DEFAULT_CONFIG } from '@/lib/config'

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.company) setConfig(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { config, loading }
}
