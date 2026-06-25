import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json()

    if (!usuario || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    const acceso = await db.clienteAcceso.findUnique({
      where: { usuario },
      include: { cliente: true },
    })

    if (!acceso || !acceso.activo) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    if (!acceso.cliente.activo) {
      return NextResponse.json({ error: 'Cuenta de cliente desactivada' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, acceso.password)
    if (!match) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: acceso.id,
        clienteId: acceso.clienteId,
        nombre: acceso.cliente.nombre,
        usuario: acceso.usuario,
        tipo: 'cliente',
      },
    })
  } catch (e) {
    console.error('POST /api/auth/login-cliente', e)
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : 'Error al iniciar sesión'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
