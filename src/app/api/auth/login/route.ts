import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json()

    if (!usuario || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Contraseña inválida' }, { status: 400 })
    }

    const user = await db.usuario.findUnique({
      where: { usuario },
      include: { rol: true },
    })
    if (!user || !user.activo) {
      await logAudit({ accion: 'LOGIN', entidad: 'Usuario', entidadId: user?.id, detalle: { usuario, resultado: 'fallo: no encontrado o inactivo' }, direccionIp: req.headers.get('x-forwarded-for') || undefined })
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      await logAudit({ accion: 'LOGIN', entidad: 'Usuario', entidadId: user.id, detalle: { usuario, resultado: 'fallo: contraseña incorrecta' }, direccionIp: req.headers.get('x-forwarded-for') || undefined })
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const { password: _, ...safeUser } = user
    await logAudit({ accion: 'LOGIN', entidad: 'Usuario', entidadId: user.id, usuario: user.usuario, detalle: { resultado: 'exitoso' }, direccionIp: req.headers.get('x-forwarded-for') || undefined })
    return NextResponse.json({ user: { ...safeUser, tipo: 'usuario' } })
  } catch (e) {
    console.error('POST /api/auth/login', e)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }
}
