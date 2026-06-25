import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const accesos = await db.clienteAcceso.findMany({
      include: { cliente: { select: { nombre: true } } },
      orderBy: { usuario: 'asc' },
    })
    return NextResponse.json(accesos.map(a => ({
      id: a.id,
      clienteId: a.clienteId,
      clienteNombre: a.cliente.nombre,
      usuario: a.usuario,
      activo: a.activo,
      createdAt: a.createdAt,
    })))
  } catch (e) {
    console.error('GET /api/clientes-acceso', e)
    return NextResponse.json({ error: 'Error al listar accesos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { clienteId, usuario, password } = await req.json()

    if (!clienteId || !usuario || !password) {
      return NextResponse.json({ error: 'clienteId, usuario y password son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const cliente = await db.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const existente = await db.clienteAcceso.findUnique({ where: { usuario } })
    if (existente) {
      return NextResponse.json({ error: 'El nombre de usuario ya está en uso' }, { status: 400 })
    }

    const yaTieneAcceso = await db.clienteAcceso.findUnique({ where: { clienteId } })
    if (yaTieneAcceso) {
      return NextResponse.json({ error: 'El cliente ya tiene un usuario de acceso' }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 10)

    const acceso = await db.clienteAcceso.create({
      data: { clienteId, usuario, password: hash },
      include: { cliente: { select: { nombre: true } } },
    })

    return NextResponse.json({
      id: acceso.id,
      clienteId: acceso.clienteId,
      clienteNombre: acceso.cliente.nombre,
      usuario: acceso.usuario,
      activo: acceso.activo,
      createdAt: acceso.createdAt,
    }, { status: 201 })
  } catch (e) {
    console.error('POST /api/clientes-acceso', e)
    return NextResponse.json({ error: 'Error al crear acceso' }, { status: 500 })
  }
}
