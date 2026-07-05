import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// GET /api/usuarios
export async function GET() {
  try {
    const usuarios = await db.usuario.findMany({
      orderBy: { createdAt: 'desc' },
      include: { rol: true },
    })
    const sinPass = usuarios.map(({ password, ...u }) => u)
    return NextResponse.json(sinPass)
  } catch (e) {
    console.error('GET /api/usuarios', e)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

// POST /api/usuarios
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { usuario, password, nombre, direccion, telefono, ciudad, provincia, lat, lng, email, nivelAcceso, activo, rolId } = body

    if (!usuario || !password || !nombre) {
      return NextResponse.json({ error: 'usuario, password y nombre requeridos' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    const created = await db.usuario.create({
      data: {
        usuario,
        password: hashed,
        nombre,
        direccion: direccion || null,
        telefono: telefono || null,
        ciudad: ciudad || null,
        provincia: provincia || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        email: email || null,
        nivelAcceso: nivelAcceso ? parseInt(nivelAcceso) : 1,
        activo: activo !== undefined ? Boolean(activo) : true,
        rolId: rolId || null,
      },
    })

    const { password: _, ...safeUser } = created
    return NextResponse.json(safeUser, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 409 })
    }
    console.error('POST /api/usuarios', e)
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
