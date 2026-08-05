import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/chat-identity'

type IdentidadResuelta = { id: string; username: string; rolNombre: string | null; tipoLogin: string } | null

async function resolverIdentidad(usuario: string, tipoLogin: string): Promise<IdentidadResuelta> {
  if (tipoLogin === 'cliente') {
    const acceso = await db.clienteAcceso.findUnique({ where: { usuario } })
    if (!acceso) return null
    return { id: acceso.id, username: acceso.usuario, rolNombre: null, tipoLogin }
  }
  const user = await db.usuario.findUnique({
    where: { usuario },
    include: { rol: true },
  })
  if (!user || !user.activo) return null
  return { id: user.id, username: user.usuario, rolNombre: user.rol?.nombre || null, tipoLogin }
}

function avisoAplica(aviso: { destino: string; usuarioId: string | null; rolNombre: string | null }, identidad: NonNullable<IdentidadResuelta>) {
  if (aviso.destino === 'TODOS') return true
  if (aviso.destino === 'USUARIO') return aviso.usuarioId === identidad.id
  if (aviso.destino === 'ROL') return aviso.rolNombre === identidad.rolNombre
  return false
}

// GET /api/avisos/consulta?usuario=xxx&tipoLogin=usuario|gerencia|cliente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const usuario = (searchParams.get('usuario') || '').trim()
    const tipoLogin = searchParams.get('tipoLogin') || 'usuario'

    if (!usuario) return NextResponse.json({ avisos: [] })
    if (!rateLimit(request, 'avisos-consulta', 60, 60000)) {
      return NextResponse.json({ avisos: [] }, { status: 429 })
    }

    const identidad = await resolverIdentidad(usuario, tipoLogin)
    if (!identidad) return NextResponse.json({ avisos: [] })

    const avisos = await db.avisoUsuario.findMany({
      where: { activo: true },
      include: {
        lecturas: {
          where: { leidoPor: `${tipoLogin}:${identidad.username}` },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const pendientes = avisos
      .filter((a) => a.lecturas.length === 0 && avisoAplica(a, identidad))
      .map((a) => ({ id: a.id, mensaje: a.mensaje }))

    return NextResponse.json({ avisos: pendientes })
  } catch (e) {
    console.error('GET /api/avisos/consulta', e)
    return NextResponse.json({ error: 'Error al consultar avisos' }, { status: 500 })
  }
}
