import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'
import { setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json()

    if (!usuario || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    const user = await db.usuario.findUnique({
      where: { usuario },
      include: { rol: true },
    })
    if (!user || !user.activo) {
      await logAudit({ accion: 'LOGIN', entidad: 'Usuario', entidadId: user?.id, detalle: { usuario, tipo: 'gerencia', resultado: 'fallo: no encontrado o inactivo' }, direccionIp: req.headers.get('x-forwarded-for') || undefined })
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    if (user.nivelAcceso !== 0) {
      await logAudit({ accion: 'LOGIN', entidad: 'Usuario', entidadId: user.id, detalle: { usuario, tipo: 'gerencia', resultado: 'fallo: nivel de acceso incorrecto' }, direccionIp: req.headers.get('x-forwarded-for') || undefined })
      return NextResponse.json({ error: 'Acceso denegado: permisos insuficientes' }, { status: 403 })
    }

    if (user.rol?.nombre !== 'gerencia') {
      await logAudit({ accion: 'LOGIN', entidad: 'Usuario', entidadId: user.id, detalle: { usuario, tipo: 'gerencia', resultado: 'fallo: rol incorrecto' }, direccionIp: req.headers.get('x-forwarded-for') || undefined })
      return NextResponse.json({ error: 'Acceso denegado: rol incorrecto' }, { status: 403 })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      await logAudit({ accion: 'LOGIN', entidad: 'Usuario', entidadId: user.id, detalle: { usuario, tipo: 'gerencia', resultado: 'fallo: contraseña incorrecta' }, direccionIp: req.headers.get('x-forwarded-for') || undefined })
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const { password: _, ...safeUser } = user
    await logAudit({ accion: 'LOGIN', entidad: 'Usuario', entidadId: user.id, usuario: user.usuario, detalle: { tipo: 'gerencia', resultado: 'exitoso' }, direccionIp: req.headers.get('x-forwarded-for') || undefined })

    const response = NextResponse.json({ user: { ...safeUser, tipo: 'gerencia' } })
    await setSessionCookie(response, {
      id: user.id,
      nombre: user.nombre,
      usuario: user.usuario,
      rolId: user.rolId ?? '',
      rol: user.rol?.nombre ?? '',
      tipo: 'gerencia',
      nivelAcceso: user.nivelAcceso,
    })
    return response
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : 'Error al iniciar sesión'
    console.error('POST /api/auth/login-gerencia', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
