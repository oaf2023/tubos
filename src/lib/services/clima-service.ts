import { db } from '@/lib/db'
import * as cheerio from 'cheerio'

const CIUDAD = 'San Nicolás de los Arroyos'
const LAT = '-33.334'
const LON = '-60.211'

interface ClimaRaw {
  temperatura: number | null
  sensTermica: number | null
  humedad: number | null
  vientoVel: number | null
  vientoDir: string | null
  presion: number | null
  codigoClima: number | null
  descripcion: string | null
  icono: string | null
  precipitacion: number | null
}

function getMomento(): string {
  const h = new Date().getHours()
  if (h < 12) return 'manana'
  if (h < 18) return 'tarde'
  return 'noche'
}

function mapWttrDesc(code: string): { desc: string; codigo: number } {
  const map: Record<string, [string, number]> = {
    '113': ['Despejado', 0],
    '116': ['Parcialmente nublado', 2],
    '119': ['Nublado', 3],
    '122': ['Muy nublado', 4],
    '143': ['Niebla', 45],
    '176': ['Lluvia ligera', 61],
    '179': ['Lluvia moderada', 63],
    '182': ['Lluvia fuerte', 65],
    '185': ['Lluvia intensa', 66],
    '200': ['Tormenta', 95],
    '227': ['Nevada ligera', 71],
    '230': ['Nevada moderada', 73],
    '248': ['Niebla densa', 48],
    '260': ['Niebla congelante', 49],
    '263': ['Llovizna', 51],
    '266': ['Llovizna moderada', 53],
    '281': ['Llovizna helada', 56],
    '284': ['Llovizna helada fuerte', 57],
    '293': ['Lluvia ligera', 61],
    '296': ['Lluvia moderada', 63],
    '299': ['Lluvia fuerte', 65],
    '302': ['Lluvia muy fuerte', 66],
    '305': ['Chubasco', 80],
    '308': ['Chubasco fuerte', 82],
    '311': ['Lluvia helada', 66],
    '314': ['Lluvia helada fuerte', 67],
    '317': ['Granizo pequeño', 77],
    '320': ['Granizo', 77],
    '323': ['Nevada ligera', 71],
    '326': ['Nevada moderada', 73],
    '329': ['Nevada fuerte', 75],
    '332': ['Nevada muy fuerte', 76],
    '335': ['Nevisca', 75],
    '338': ['Ventisca', 76],
    '350': ['Hielo', 78],
    '353': ['Chubasco ligero', 80],
    '356': ['Chubasco moderado', 81],
    '359': ['Chubasco fuerte', 82],
    '362': ['Chubasco de granizo pequeño', 77],
    '365': ['Chubasco de granizo', 77],
    '368': ['Chubasco de nieve ligero', 85],
    '371': ['Chubasco de nieve fuerte', 86],
    '374': ['Chubasco de hielo', 78],
    '377': ['Chubasco de granizo', 77],
    '386': ['Tormenta ligera', 95],
    '389': ['Tormenta moderada', 96],
    '392': ['Tormenta con nieve', 97],
    '395': ['Tormenta fuerte', 99],
  }
  const m = map[code]
  if (m) return { desc: m[0], codigo: m[1] }
  return { desc: `Código ${code}`, codigo: 0 }
}

// ─── LOCAL (wttr.in) ────────────────────────────────────────

export async function fetchLocal(): Promise<ClimaRaw> {
  const url = `https://wttr.in/${encodeURIComponent(CIUDAD)}?format=j1&lang=es`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  const data = await res.json()
  const cc = data?.current_condition?.[0]
  if (!cc) return emptyRaw()

  const { desc, codigo } = mapWttrDesc(cc.weatherCode || '')
  return {
    temperatura: cc.temp_C ? parseFloat(cc.temp_C) : null,
    sensTermica: cc.FeelsLikeC ? parseFloat(cc.FeelsLikeC) : null,
    humedad: cc.humidity ? parseInt(cc.humidity, 10) : null,
    vientoVel: cc.windspeedKmph ? parseFloat(cc.windspeedKmph) : null,
    vientoDir: cc.winddir16Point || null,
    presion: null,
    codigoClima: codigo,
    descripcion: cc.weatherDesc?.[0]?.value || desc,
    icono: cc.weatherCode || null,
    precipitacion: cc.precipMM ? parseFloat(cc.precipMM) : null,
  }
}

// ─── SMN ─────────────────────────────────────────────────────

export async function fetchSMN(): Promise<ClimaRaw> {
  try {
    return await fetchSMNJson()
  } catch {
    return await fetchSMNHtml()
  }
}

async function fetchSMNJson(): Promise<ClimaRaw> {
  const stationId = process.env.SMN_STATION_ID || 'SNI'
  const url = `https://ws.smn.gob.ar/map_items/weather?city_id=${stationId}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error(`SMN JSON returned ${res.status}`)
  const data = await res.json()
  return {
    temperatura: data?.temperature ?? null,
    sensTermica: data?.thermal_sensation ?? null,
    humedad: data?.humidity ?? null,
    vientoVel: data?.wind_speed ?? null,
    vientoDir: data?.wind_direction ?? null,
    presion: data?.pressure ?? null,
    codigoClima: data?.weather_code ?? null,
    descripcion: data?.weather_description ?? null,
    icono: data?.weather_icon ?? null,
    precipitacion: data?.precipitation ?? null,
  }
}

async function fetchSMNHtml(): Promise<ClimaRaw> {
  const stationId = process.env.SMN_STATION_ID || 'SNI'
  const url = `https://www.smn.gob.ar/estacion/${stationId}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  const html = await res.text()
  const $ = cheerio.load(html)

  const parseVal = (sel: string): number | null => {
    const txt = $(sel).first().text().trim()
    const n = parseFloat(txt.replace(',', '.'))
    return isNaN(n) ? null : n
  }

  return {
    temperatura: parseVal('.temperatura'),
    sensTermica: parseVal('.sensacion-termica'),
    humedad: parseVal('.humedad'),
    vientoVel: parseVal('.viento-vel'),
    vientoDir: $('.viento-dir').first().text().trim() || null,
    presion: parseVal('.presion'),
    codigoClima: null,
    descripcion: $('.estado-cielo').first().text().trim() || null,
    icono: null,
    precipitacion: parseVal('.precipitacion'),
  }
}

// ─── FORÁNEA (Open-Meteo) ───────────────────────────────────

export async function fetchForanea(): Promise<ClimaRaw> {
  const params = new URLSearchParams({
    latitude: LAT,
    longitude: LON,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation',
    timezone: 'auto',
  })
  const url = `https://api.open-meteo.com/v1/forecast?${params}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
  const data = await res.json()
  const c = data?.current
  if (!c) return emptyRaw()

  const dirMap: Record<number, string> = {
    0: 'N', 45: 'NE', 90: 'E', 135: 'SE',
    180: 'S', 225: 'SO', 270: 'O', 315: 'NO',
  }
  const windDir = c.wind_direction_10m != null
    ? dirMap[Math.round(c.wind_direction_10m / 45) * 45] || `${c.wind_direction_10m}°`
    : null

  return {
    temperatura: c.temperature_2m ?? null,
    sensTermica: c.apparent_temperature ?? null,
    humedad: c.relative_humidity_2m ?? null,
    vientoVel: c.wind_speed_10m ?? null,
    vientoDir: windDir,
    presion: c.surface_pressure ?? null,
    codigoClima: c.weather_code ?? null,
    descripcion: null,
    icono: null,
    precipitacion: c.precipitation ?? null,
  }
}

// ─── UTILIDADES ──────────────────────────────────────────────

function emptyRaw(): ClimaRaw {
  return {
    temperatura: null, sensTermica: null, humedad: null,
    vientoVel: null, vientoDir: null, presion: null,
    codigoClima: null, descripcion: null, icono: null,
    precipitacion: null,
  }
}

// ─── ACTUALIZACIÓN ──────────────────────────────────────────

export async function actualizarClima(momento?: string) {
  const m = momento || getMomento()
  const ahora = new Date()
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())

  const fuentes: { key: string; fetch: () => Promise<ClimaRaw> }[] = [
    { key: 'local', fetch: fetchLocal },
    { key: 'SMN', fetch: fetchSMN },
    { key: 'foranea', fetch: fetchForanea },
  ]

  const results: { fuente: string; ok: boolean; error?: string }[] = []

  for (const f of fuentes) {
    try {
      const raw = await f.fetch()
      await db.clima.upsert({
        where: {
          fechaDate_momento_fuente: {
            fechaDate: hoy,
            momento: m,
            fuente: f.key,
          },
        },
        update: {
          fecha: ahora,
          temperatura: raw.temperatura,
          sensTermica: raw.sensTermica,
          humedad: raw.humedad,
          vientoVel: raw.vientoVel,
          vientoDir: raw.vientoDir,
          presion: raw.presion,
          codigoClima: raw.codigoClima,
          descripcion: raw.descripcion,
          icono: raw.icono,
          precipitacion: raw.precipitacion,
          rawJson: JSON.stringify(raw),
        },
        create: {
          fecha: ahora,
          fechaDate: hoy,
          momento: m,
          fuente: f.key,
          temperatura: raw.temperatura,
          sensTermica: raw.sensTermica,
          humedad: raw.humedad,
          vientoVel: raw.vientoVel,
          vientoDir: raw.vientoDir,
          presion: raw.presion,
          codigoClima: raw.codigoClima,
          descripcion: raw.descripcion,
          icono: raw.icono,
          precipitacion: raw.precipitacion,
          rawJson: JSON.stringify(raw),
        },
      })
      results.push({ fuente: f.key, ok: true })
    } catch (e) {
      results.push({ fuente: f.key, ok: false, error: String(e) })
    }
  }

  return { momento: m, fecha: ahora.toISOString(), results }
}

export async function fetchClimaHistorico(fecha: Date, momento: string): Promise<void> {
  const fechaDate = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const yyyymmdd = fecha.toISOString().slice(0, 10)

  const params = new URLSearchParams({
    latitude: LAT,
    longitude: LON,
    start_date: yyyymmdd,
    end_date: yyyymmdd,
    hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation,weather_code',
    timezone: 'auto',
  })
  const url = `https://api.open-meteo.com/v1/era5?${params}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const data = await res.json()
    const hourly = data?.hourly
    if (!hourly?.time?.length) return

    const horaIdx: Record<string, number> = {
      manana: 8,
      tarde: 15,
      noche: 20,
    }
    const idx = horaIdx[momento]
    if (idx === undefined) return

    const dirMap: Record<number, string> = {
      0: 'N', 45: 'NE', 90: 'E', 135: 'SE',
      180: 'S', 225: 'SO', 270: 'O', 315: 'NO',
    }
    const wd = hourly.wind_direction_10m?.[idx]
    const windDir = wd != null
      ? dirMap[Math.round(wd / 45) * 45] || `${wd}°`
      : null

    const raw: ClimaRaw = {
      temperatura: hourly.temperature_2m?.[idx] ?? null,
      sensTermica: null,
      humedad: hourly.relative_humidity_2m?.[idx] ?? null,
      vientoVel: hourly.wind_speed_10m?.[idx] ?? null,
      vientoDir: windDir,
      presion: hourly.surface_pressure?.[idx] ?? null,
      codigoClima: hourly.weather_code?.[idx] ?? null,
      descripcion: null,
      icono: null,
      precipitacion: hourly.precipitation?.[idx] ?? null,
    }

    await db.clima.upsert({
      where: {
        fechaDate_momento_fuente: {
          fechaDate,
          momento,
          fuente: 'foranea',
        },
      },
      update: { ...raw, rawJson: JSON.stringify(raw) },
      create: {
        fecha: new Date(`${yyyymmdd}T${String(idx).padStart(2, '0')}:00:00`),
        fechaDate,
        momento,
        fuente: 'foranea',
        ...raw,
        rawJson: JSON.stringify(raw),
      },
    })
  } catch {
    // silencioso para histórico — no bloquear el resto
  }
}
