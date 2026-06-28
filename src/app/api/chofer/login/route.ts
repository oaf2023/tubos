import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// POST /api/chofer/login — Login de chofer + crea sesión + marca en línea
export async function POST(request: NextRequest) {
  try {
    const { usuario, password, navegadorInfo } = await request.json()

    if (!usuario || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 })
    }

    const user = await db.usuario.findUnique({
      where: { usuario },
      include: { rol: true },
    })

    if (!user || !user.activo) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // Generar token de sesión
    const token = createHash('sha256')
      .update(`${user.id}:${Date.now()}:${Math.random()}`)
      .digest('hex')
      .substring(0, 32)

    // Buscar ruta activa asignada a este chofer
    const rutaActiva = await db.ruta.findFirst({
      where: {
        conductorId: user.id,
        estado: 'EN_PROGRESO',
      },
      include: {
        paradas: {
          orderBy: { orden: 'asc' },
          where: { estado: { not: 'ENTREGADO' } },
        },
        vehicle: true,
      },
      orderBy: { navigationStartedAt: 'desc' },
    })

    // Crear o actualizar sesión
    const existingSession = await db.sesionConductor.findFirst({
      where: { conductorId: user.id, estaEnLinea: true },
    })

    if (existingSession) {
      await db.sesionConductor.update({
        where: { id: existingSession.id },
        data: {
          token,
          rutaId: rutaActiva?.id ?? existingSession.rutaId,
          ultimoHeartbeat: new Date(),
          navegadorInfo: navegadorInfo || null,
        },
      })
    } else {
      await db.sesionConductor.create({
        data: {
          conductorId: user.id,
          token,
          rutaId: rutaActiva?.id ?? null,
          estaEnLinea: true,
          navegadorInfo: navegadorInfo || null,
          ultimoHeartbeat: new Date(),
        },
      })
    }

    return NextResponse.json({
      token,
      conductor: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
      },
      ruta: rutaActiva ? {
        id: rutaActiva.id,
        nombre: rutaActiva.nombre,
        estado: rutaActiva.estado,
        distanciaKm: rutaActiva.distanciaKm,
        duracionHoras: rutaActiva.duracionHoras,
        paradas: rutaActiva.paradas.map((p) => ({
          id: p.id,
          orden: p.orden,
          nombre: p.nombre,
          lat: p.lat,
          lng: p.lng,
          demandaTubos: p.demandaTubos,
          tipoOperacion: p.tipoOperacion,
        })),
        vehicle: rutaActiva.vehicle ? {
          patente: rutaActiva.vehicle.patente,
          marca: rutaActiva.vehicle.marca,
          modelo: rutaActiva.vehicle.modelo,
        } : null,
      } : null,
    })
  } catch (e) {
    console.error('POST /api/chofer/login', e)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }
}
