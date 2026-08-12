// Nombre: collectors.ts
// Fecha: 2026-08-12
// Versión: 1.0.0
// Utilidad: Colectores de telemetría del sistema (CPU, RAM, discos, red, batería, procesos, SO, temperatura)
// Descripción: Funciones reutilizables que devuelven datos estructurados con envoltorio estándar {success, timestamp, data, error}
// Dependencias: Solo APIs estándar de Node.js (os, fs, child_process, util)
// API externa: No requerida
// Integración: src/lib/telemetry/index.ts (snapshot, health, alertas)
// Compatibilidad: Linux (producción) / Windows / macOS (desarrollo) - cada métrica degrada a {available:false} si no es soportada
import os from 'os'
import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileP = promisify(execFile)

export interface StdResult {
  success: boolean
  timestamp: string
  data: Record<string, unknown> | Record<string, unknown>[] | null
  error: string | null
}

const ok = (data: unknown): StdResult => ({
  success: true,
  timestamp: new Date().toISOString(),
  data: data as Record<string, unknown>,
  error: null,
})

const fail = (error: string, code = 'FAILED'): StdResult => ({
  success: false,
  timestamp: new Date().toISOString(),
  data: null,
  error: { code, message: error } as unknown as string,
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------- Helpers de formato ----------
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes
  let i = -1
  do {
    v /= 1024
    i++
  } while (v >= 1024 && i < units.length - 1)
  return `${v.toFixed(1)} ${units[i]}`
}

export function fmtUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ---------- Información general del sistema (cachable) ----------
let systemCache: Record<string, unknown> | null = null

export function getSystemInfo(): StdResult {
  if (systemCache) return ok(systemCache)
  try {
    const platform = os.platform()
    const bootSeconds = Math.floor(Date.now() / 1000 - os.uptime())
    systemCache = {
      os: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux',
      platform,
      release: os.release(),
      architecture: os.arch(),
      hostname: os.hostname(),
      user: (() => {
        try {
          return os.userInfo().username
        } catch {
          return null
        }
      })(),
      boot_time: new Date(bootSeconds * 1000).toISOString(),
      boot_timestamp: bootSeconds,
      uptime_seconds: Math.floor(os.uptime()),
      uptime_human: fmtUptime(os.uptime()),
      timezone: (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone
        } catch {
          return null
        }
      })(),
      node_version: process.version,
      loadavg: os.loadavg(),
      docker: (() => {
        try {
          return fs.existsSync('/.dockerenv')
        } catch {
          return false
        }
      })(),
    }
    return ok(systemCache)
  } catch (e) {
    return fail((e as Error).message)
  }
}

// ---------- CPU ----------
export function getCpuInfo(): StdResult {
  try {
    const cpus = os.cpus()
    if (!cpus.length) return fail('Sin información de CPU', 'NOT_AVAILABLE')
    const total = { idle: 0, busy: 0 }
    const perCore = cpus.map((c) => {
      const idle = c.times.idle
      const sum = c.times.user + c.times.nice + c.times.sys + c.times.irq + c.times.idle
      total.idle += idle
      total.busy += sum - idle
      return Math.round((1 - idle / (sum || 1)) * 1000) / 10
    })
    const usagePercent = Math.round((total.busy / (total.busy + total.idle || 1)) * 1000) / 10
    const logicalCores = cpus.length
    const load = os.loadavg()
    return ok({
      usage_percent: usagePercent,
      idle_percent: Math.round(1000 - usagePercent * 10) / 10,
      logical_cores: logicalCores,
      physical_cores: Math.max(1, Math.round(logicalCores / 2)),
      architecture: os.arch(),
      model: cpus[0].model,
      frequency_mhz: cpus[0].speed,
      per_core: perCore,
      load_average_1m: load[0] ?? null,
      load_average_5m: load[1] ?? null,
      load_average_15m: load[2] ?? null,
    })
  } catch (e) {
    return fail((e as Error).message)
  }
}

// ---------- Memoria RAM ----------
export function getMemoryInfo(): StdResult {
  try {
    const total = os.totalmem()
    const free = os.freemem()
    const used = total - free
    const usagePercent = Math.round((used / (total || 1)) * 1000) / 10
    const memInfo = (() => {
      try {
        const raw = fs.readFileSync('/proc/meminfo', 'utf8')
        const get = (k: string) => {
          const m = raw.match(new RegExp(`^${k}:\\s+(\\d+)`))
          return m ? parseInt(m[1], 10) * 1024 : null
        }
        return {
          swap_total: get('SwapTotal'),
          swap_free: get('SwapFree'),
          cached: get('Cached'),
          buffers: get('Buffers'),
        }
      } catch {
        return null
      }
    })()
    const swapUsed =
      memInfo?.swap_total != null && memInfo?.swap_free != null
        ? memInfo.swap_total - memInfo.swap_free
        : null
    return ok({
      total_bytes: total,
      used_bytes: used,
      free_bytes: free,
      available_bytes: free,
      usage_percent: usagePercent,
      total_gb: Math.round((total / 1073741824) * 10) / 10,
      used_gb: Math.round((used / 1073741824) * 10) / 10,
      free_gb: Math.round((free / 1073741824) * 10) / 10,
      cached_bytes: memInfo?.cached ?? null,
      buffers_bytes: memInfo?.buffers ?? null,
      swap: memInfo?.swap_total
        ? {
            total_bytes: memInfo.swap_total,
            used_bytes: swapUsed,
            free_bytes: memInfo.swap_free,
            usage_percent:
              memInfo.swap_total > 0 ? Math.round((((swapUsed || 0) / memInfo.swap_total)) * 1000) / 10 : 0,
          }
        : { available: false },
    })
  } catch (e) {
    return fail((e as Error).message)
  }
}

// ---------- Discos ----------
async function disksWindows(): Promise<Record<string, unknown>[] | null> {
  try {
    const { stdout } = await execFileP(
      'powershell.exe',
      [
        '-NoProfile', '-NonInteractive',
        '-Command',
        'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json -Compress',
      ],
      { timeout: 8000, windowsHide: true }
    )
    if (!stdout.trim()) return null
    const parsed = JSON.parse(stdout)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    return arr
      .filter((d: any) => d.DeviceID && d.Size)
      .map((d: any) => {
        const total = Number(d.Size)
        const free = Number(d.FreeSpace) || 0
        const used = total - free
        return {
          device: d.DeviceID,
          mount: d.DeviceID,
          filesystem: null,
          total_gb: Math.round((total / 1073741824) * 10) / 10,
          used_gb: Math.round((used / 1073741824) * 10) / 10,
          free_gb: Math.round((free / 1073741824) * 10) / 10,
          usage_percent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
        }
      })
  } catch {
    return null
  }
}

export async function getDiskInfo(): Promise<StdResult> {
  try {
    const platform = os.platform()
    if (platform === 'win32') {
      const disks = await disksWindows()
      if (disks && disks.length) return ok({ disks })
      return fail('Sin discos accesibles', 'NOT_AVAILABLE')
    }
    if (platform === 'linux' || platform === 'darwin') {
      const { stdout } = await execFileP('df', ['-kP'], { timeout: 4000 })
      const lines = stdout.trim().split('\n').slice(1)
      const disks = lines
        .map((line) => {
          const parts = line.trim().split(/\s+/)
          if (parts.length < 6) return null
          const [device, blocks, used, avail, pct, ...mountParts] = parts
          const mount = mountParts.join(' ')
          const kb = parseInt(blocks, 10)
          if (!kb || device === 'none' || device.startsWith('tmpfs')) return null
          const usagePercent = Math.round((parseInt(used, 10) / kb) * 1000) / 10
          return {
            device,
            mount,
            filesystem: null,
            total_gb: Math.round((kb / 1048576) * 10) / 10,
            used_gb: Math.round((parseInt(used, 10) / 1048576) * 10) / 10,
            free_gb: Math.round((parseInt(avail, 10) / 1048576) * 10) / 10,
            usage_percent: usagePercent,
          }
        })
        .filter(Boolean) as Record<string, unknown>[]
      if (disks.length === 0) return fail('Sin discos accesibles', 'NOT_AVAILABLE')
      return ok({ disks })
    }
    return fail('Sistema operativo no soportado para df', 'UNSUPPORTED')
  } catch (e) {
    return fail((e as Error).message, 'TIMEOUT_OR_FAILED')
  }
}

// ---------- Procesos ----------
async function processesWindows(limit: number): Promise<Record<string, unknown>[] | null> {
  try {
    const totalMem = os.totalmem()
    const { stdout } = await execFileP(
      'powershell.exe',
      [
        '-NoProfile', '-NonInteractive',
        '-Command',
        'Get-Process | Sort-Object WS -Descending | Select-Object -First 20 Id,ProcessName,CPU,@{n="WS";e={$_.WorkingSet64}} | ConvertTo-Json -Compress',
      ],
      { timeout: 8000, windowsHide: true }
    )
    if (!stdout.trim()) return null
    const parsed = JSON.parse(stdout)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    return arr
      .slice(0, limit)
      .map((p: any) => ({
        pid: p.Id,
        name: p.ProcessName,
        cpu_percent: null,
        memory_percent: totalMem > 0 && p.WS ? Math.round(((Number(p.WS) / totalMem) * 100) * 10) / 10 : null,
        rss_kb: p.WS ? Math.round(Number(p.WS) / 1024) : null,
        rss_mb: p.WS ? Math.round((Number(p.WS) / 1048576) * 10) / 10 : null,
      }))
  } catch {
    return null
  }
}

export async function getTopProcesses(limit = 5): Promise<StdResult> {
  try {
    if (os.platform() === 'win32') {
      const procs = await processesWindows(limit)
      if (procs && procs.length) return ok({ processes: procs })
      return fail('Sin procesos accesibles', 'NOT_AVAILABLE')
    }
    const { stdout } = await execFileP('ps', ['-eo', 'pid,comm,%cpu,%mem,rss', '--sort=-%cpu'], { timeout: 4000 })
    const processes = stdout
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => {
        const m = line.trim().match(/^(\d+)\s+(.+?)\s+([\d.]+)\s+([\d.]+)\s+(\d+)$/)
        if (!m) return null
        return {
          pid: parseInt(m[1], 10),
          name: m[2],
          cpu_percent: parseFloat(m[3]),
          memory_percent: parseFloat(m[4]),
          rss_kb: parseInt(m[5], 10),
          rss_mb: Math.round((parseInt(m[5], 10) / 1024) * 10) / 10,
        }
      })
      .filter(Boolean)
      .slice(0, limit) as Record<string, unknown>[]
    return ok({ processes })
  } catch (e) {
    return fail((e as Error).message, 'NOT_AVAILABLE')
  }
}

// ---------- Red ----------
function readProcNetDev(): { rx: number; tx: number } | null {
  try {
    const raw = fs.readFileSync('/proc/net/dev', 'utf8')
    let rx = 0
    let tx = 0
    for (const line of raw.split('\n').slice(2)) {
      const m = line.match(/:\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/)
      if (m) {
        rx += parseInt(m[1], 10)
        tx += parseInt(m[2], 10)
      }
    }
    return { rx, tx }
  } catch {
    return null
  }
}

export async function getNetworkInfo(sampleSeconds = 1): Promise<StdResult> {
  try {
    const interfacesRaw = os.networkInterfaces()
    const interfaces = Object.entries(interfacesRaw)
      .map(([name, addrs]) => {
        const ipv4 = addrs?.find((a) => a.family === 'IPv4')
        const ipv6 = addrs?.find((a) => a.family === 'IPv6')
        const isInternal = addrs?.every((a) => a.internal)
        const type = isInternal ? 'loopback' : /^(eth|en)/i.test(name) ? 'ethernet' : /^(wl|wi)/i.test(name) ? 'wifi' : /(vpn|tun|wg|tailscale|utun)/i.test(name) ? 'vpn' : 'other'
        return {
          name,
          status: isInternal ? 'up' : ipv4 ? 'up' : 'down',
          type,
          ipv4: ipv4?.address ?? null,
          ipv6: ipv6?.address ?? null,
          mac: addrs?.find((a) => a.mac && a.mac !== '00:00:00:00:00:00')?.mac ?? null,
          internal: isInternal,
        }
      })
      .filter((i) => i.name !== 'lo' && !i.internal)

    const t1 = readProcNetDev()
    const total = t1 ?? { rx: 0, tx: 0 }
    let speed: { download_mbps: number | null; upload_mbps: number | null } = {
      download_mbps: null,
      upload_mbps: null,
    }
    if (t1) {
      await sleep(sampleSeconds * 1000)
      const t2 = readProcNetDev()
      if (t2) {
        speed = {
          download_mbps: Math.round(((t2.rx - t1.rx) * 8) / sampleSeconds / 1e6 * 100) / 100,
          upload_mbps: Math.round(((t2.tx - t1.tx) * 8) / sampleSeconds / 1e6 * 100) / 100,
        }
      }
    }
    return ok({
      hostname: os.hostname(),
      interfaces,
      active_interface: interfaces.find((i) => i.status === 'up' && i.type !== 'loopback')?.name ?? null,
      total_download_mb: Math.round((total.rx / 1048576) * 10) / 10,
      total_upload_mb: Math.round((total.tx / 1048576) * 10) / 10,
      ...speed,
    })
  } catch (e) {
    return fail((e as Error).message)
  }
}

// ---------- Batería ----------
export function getBatteryInfo(): StdResult {
  try {
    const base = '/sys/class/power_supply'
    if (!fs.existsSync(base)) return ok({ available: false })
    const entries = fs.readdirSync(base).filter((e) => e.startsWith('BAT'))
    if (entries.length === 0) return ok({ available: false })
    const read = (p: string) => {
      try {
        return fs.readFileSync(`${base}/${entries[0]}/${p}`, 'utf8').trim()
      } catch {
        return null
      }
    }
    const percent = read('capacity')
    const status = read('status')
    const energyNow = read('energy_now')
    const energyFull = read('energy_full')
    const secondsLeft =
      energyNow && energyFull && percent
        ? Math.round((parseInt(energyNow, 10) / Math.max(parseInt(energyFull, 10), 1)) * parseInt(percent, 10) * 36)
        : null
    return ok({
      available: true,
      percent: percent ? parseInt(percent, 10) : null,
      charging: status === 'Charging',
      power_plugged: status === 'Charging' || status === 'Full',
      status: status ?? null,
      seconds_left: secondsLeft,
      batteries: entries.length,
      health: read('capacity_level') ?? null,
    })
  } catch (e) {
    return fail((e as Error).message)
  }
}

// ---------- Temperaturas ----------
export function getTemperatureInfo(): StdResult {
  try {
    const base = '/sys/class/thermal'
    if (!fs.existsSync(base)) return ok({ available: false })
    const zones = fs.readdirSync(base).filter((e) => e.startsWith('thermal_zone'))
    const sensors: Record<string, unknown>[] = []
    for (const z of zones) {
      try {
        const type = fs.readFileSync(`${base}/${z}/type`, 'utf8').trim()
        const temp = parseInt(fs.readFileSync(`${base}/${z}/temp`, 'utf8').trim(), 10)
        sensors.push({ sensor: type, celsius: temp / 1000 })
      } catch {
        /* ignorar zonas ilegibles */
      }
    }
    if (sensors.length === 0) return ok({ available: false })
    const cpu = sensors.find((s) => String(s.sensor).toLowerCase().includes('cpu')) ?? null
    return ok({ available: true, cpu_celsius: cpu?.celsius ?? null, sensors })
  } catch (e) {
    return fail((e as Error).message)
  }
}

// ---------- GPU (opcional) ----------
export async function getGpuInfo(): Promise<StdResult> {
  try {
    const { stdout } = await execFileP('nvidia-smi', ['--query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu', '--format=csv,noheader,nounits'], { timeout: 3000 })
    const line = stdout.trim().split('\n')[0]
    if (!line) return ok({ available: false })
    const [model, memTotal, memUsed, util, temp] = line.split(',').map((s) => s.trim())
    return ok({
      available: true,
      manufacturer: 'NVIDIA',
      model,
      memory_total_mb: parseInt(memTotal, 10) || null,
      memory_used_mb: parseInt(memUsed, 10) || null,
      utilization_percent: parseFloat(util) || 0,
      temperature_celsius: parseFloat(temp) || null,
      cuda: true,
      count: stdout.trim().split('\n').length,
    })
  } catch {
    return ok({ available: false, reason: 'not_installed' })
  }
}

// ---------- Servicios y Docker (opcional) ----------
export function getServiceStatus(_services: string[]): StdResult {
  return ok({ available: false, reason: 'not_implemented' })
}

export function getDockerInfo(): StdResult {
  try {
    if (!fs.existsSync('/var/run/docker.sock')) return ok({ available: false, reason: 'not_installed' })
    return ok({ available: true, socket: '/var/run/docker.sock', detail: 'consulte docker CLI para detalle' })
  } catch {
    return ok({ available: false, reason: 'not_installed' })
  }
}
