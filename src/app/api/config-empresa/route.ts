import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const CONFIG_PATH = join(process.cwd(), 'config.json')

const DEFAULT_CONFIG = {
  company: { name: 'Districon', tagline: 'Ferreteria Industrial - Gases para soldadura', country: 'Argentina', locale: 'es-AR' },
  base: { name: 'San Nicolás de los Arroyos', province: 'Buenos Aires', lat: -33.3293, lng: -60.2244, tipo: 'BASE', address: 'Av. Savio y Bogado', phone: '+54 336 442-2200' },
  map: { defaultCenter: [-33.3293, -60.2244], defaultZoom: 6 },
  meta: { title: 'Control Digital ManejaDatos - Districon', description: 'Sistema integral de control y geolocalización de tubos de gases para soldadura.', keywords: ['gases soldadura', 'tubos gases', 'argón', 'acetileno'], author: '' },
}

function readConfig() {
  if (existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) }
  }
  return DEFAULT_CONFIG
}

function writeConfig(data: unknown) {
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET() {
  try {
    const config = readConfig()
    return NextResponse.json(config)
  } catch {
    return NextResponse.json(DEFAULT_CONFIG)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const current = readConfig()

    // Merge profundo
    const merged = {
      ...current,
      company: { ...current.company, ...body.company },
      base: { ...current.base, ...body.base },
      map: { ...current.map, ...body.map },
      meta: { ...current.meta, ...body.meta },
    }

    writeConfig(merged)
    return NextResponse.json({ success: true, config: merged })
  } catch (e) {
    console.error('PUT /api/config-empresa', e)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }
}
