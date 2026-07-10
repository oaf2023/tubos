import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { limpiarCacheTA } from '@/lib/arca/wsaa'

export async function PUT(req: NextRequest, { params }: any) {
  try {
    const body = await req.json()
    const data: any = {}
    if (body.alias !== undefined) data.alias = body.alias
    if (body.servicio !== undefined) data.servicio = body.servicio
    if (body.environment !== undefined) data.environment = body.environment
    if (body.certPem !== undefined) data.certPem = body.certPem
    if (body.keyPem !== undefined) data.keyPem = body.keyPem
    if (body.cuit !== undefined) data.cuit = body.cuit
    if (body.activo !== undefined) data.activo = body.activo

    const credential = await db.arcaCredential.update({
      where: { id: params.id },
      data,
    })
    limpiarCacheTA()
    return NextResponse.json({ ...credential, certPem: '***', keyPem: '***' })
  } catch (e) {
    console.error('PUT /api/comprobantes/credenciales/[id]', e)
    return NextResponse.json({ error: 'Error al actualizar credencial' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: any) {
  try {
    await db.arcaCredential.delete({ where: { id: params.id } })
    limpiarCacheTA()
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/comprobantes/credenciales/[id]', e)
    return NextResponse.json({ error: 'Error al eliminar credencial' }, { status: 500 })
  }
}
