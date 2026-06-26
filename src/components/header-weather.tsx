'use client'

import { useState, useEffect, useRef } from 'react'
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, Wind, Droplets, MapPin, ChevronDown, Loader2 } from 'lucide-react'

const CIUDAD = 'San Nicolás de los Arroyos'
const API_URL = `https://wttr.in/${encodeURIComponent(CIUDAD)}?format=j1&lang=es`
const CACHE_KEY = 'districon_weather'
const CACHE_TTL = 15 * 60 * 1000

interface WeatherData {
  temp: string
  desc: string
  humidity: string
  wind: string
  icon: string
  feelsLike: string
}

function getWeatherIcon(desc: string) {
  const lc = desc.toLowerCase()
  if (lc.includes('tormenta') || lc.includes('rayo')) return CloudLightning
  if (lc.includes('lluvia') && (lc.includes('fuerte') || lc.includes('intensa'))) return CloudRain
  if (lc.includes('lluvia') || lc.includes('llovizna')) return CloudDrizzle
  if (lc.includes('nieve') || lc.includes('nevada')) return CloudSnow
  if (lc.includes('niebla') || lc.includes('bruma') || lc.includes('neblina')) return CloudFog
  if (lc.includes('nube') || lc.includes('nublado')) return Cloud
  if (lc.includes('despejado') || lc.includes('soleado')) return Sun
  return Cloud
}

export default function HeaderWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setWeather(parsed.data)
          setLoading(false)
          return
        }
      } catch { /* ignore */ }
    }

    fetch(API_URL)
      .then((r) => r.json())
      .then((data) => {
        const cc = data?.current_condition?.[0]
        if (!cc) { setLoading(false); return }
        const w: WeatherData = {
          temp: cc.temp_C || '--',
          desc: cc.weatherDesc?.[0]?.value || '--',
          humidity: cc.humidity || '--',
          wind: `${cc.windspeedKmph || '--'} km/h`,
          icon: cc.weatherCode || '',
          feelsLike: cc.FeelsLikeC || cc.temp_C || '--',
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: w, ts: Date.now() }))
        setWeather(w)
        setLoading(false)
      })
      .catch(() => { setLoading(false) })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (loading) return null
  if (!weather) return null

  const Icon = getWeatherIcon(weather.desc)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        title={`${weather.desc} · ${weather.temp}°C`}
      >
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-medium">{weather.temp}°C</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-medium text-slate-700">{CIUDAD}</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-orange-50">
              <Icon className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{weather.temp}°C</div>
              <div className="text-xs text-slate-500 capitalize">{weather.desc}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Droplets className="w-3 h-3 text-sky-500" />
              <span>Humedad: {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Wind className="w-3 h-3 text-teal-500" />
              <span>Viento: {weather.wind}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            Sensación térmica: {weather.feelsLike}°C
          </div>
        </div>
      )}
    </div>
  )
}
