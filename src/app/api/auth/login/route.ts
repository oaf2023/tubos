import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json()

    if (!usuario || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    const user = await db.usuario.findUnique({ where: { usuario } })
    if (!user || !user.activo) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const { password: _, ...safeUser } = user
    return NextResponse.json({ user: safeUser })
  } catch (e) {
    console.error('POST /api/auth/login', e)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }
}
