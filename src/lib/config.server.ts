import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { AppConfig } from './config'
import { DEFAULT_CONFIG } from './config'

let _config: AppConfig | null = null

const CONFIG_PATHS = [
  join(process.cwd(), 'config.json'),
  join(process.cwd(), '..', 'config.json'),
]

export function loadConfig(): AppConfig {
  if (_config) return _config

  for (const p of CONFIG_PATHS) {
    if (existsSync(p)) {
      const raw = readFileSync(p, 'utf-8')
      _config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as AppConfig
      if (_config.base) {
        _config.base = { ...DEFAULT_CONFIG.base, ..._config.base }
      }
      if (_config.company) {
        _config.company = { ...DEFAULT_CONFIG.company, ..._config.company }
      }
      return _config
    }
  }

  _config = DEFAULT_CONFIG
  return _config
}
