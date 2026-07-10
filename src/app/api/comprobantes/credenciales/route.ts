import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { limpiarCacheTA } from '@/lib/arca/wsaa'

export async function GET() {
  try {
    const credenciales = await db.arcaCredential.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(credenciales.map(c => ({
      ...c,
      certPem: c.certPem ? '***' : null,
      keyPem: c.keyPem ? '***' : null,
    })))
  } catch (e) {
    console.error('GET /api/comprobantes/credenciales', e)
    return NextResponse.json({ error: 'Error al obtener credenciales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const existing = await db.arcaCredential.findUnique({ where: { alias: body.alias } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una credencial con ese alias' }, { status: 409 })
    }
    const credential = await db.arcaCredential.create({
      data: {
        alias: body.alias,
        servicio: body.servicio || 'wsfe',
        environment: body.environment || 'HOMOLOGACION',
        certPem: body.certPem,
        keyPem: body.keyPem,
        cuit: body.cuit,
        activo: body.activo ?? false,
      },
    })
    limpiarCacheTA()
    return NextResponse.json({ ...credential, certPem: '***', keyPem: '***' }, { status: 201 })
  } catch (e) {
    console.error('POST /api/comprobantes/credenciales', e)
    return NextResponse.json({ error: 'Error al crear credencial' }, { status: 500 })
  }
}
