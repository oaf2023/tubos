import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/avisos - lista avisos con estado de lectura
export async function GET(req: NextRequest) {
  try {
    const roleCheck = await requireRole('admin', 'auditor', 'deposito', 'gerencia')(req)
    if (roleCheck) return roleCheck

    const avisos = await db.avisoUsuario.findMany({
      include: {
        lecturas: {
          select: { leidoPor: true, leidoEn: true },
          orderBy: { leidoEn: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ avisos })
  } catch (e) {
    console.error('GET /api/avisos', e)
    return NextResponse.json({ error: 'Error al obtener avisos' }, { status: 500 })
  }
}

// POST /api/avisos - crear aviso { mensaje, destino, usuarioId?, rolNombre? }
export async function POST(req: NextRequest) {
  try {
    const roleCheck = await requireRole('admin', 'deposito')(req)
    if (roleCheck) return roleCheck

    const body = await req.json()
    const { mensaje, destino, usuarioId, rolNombre } = body

    if (!mensaje || !mensaje.trim()) {
      return NextResponse.json({ error: 'El mensaje es requerido' }, { status: 400 })
    }
    if (mensaje.length > 2000) {
      return NextResponse.json({ error: 'El mensaje no puede superar 2000 caracteres' }, { status: 400 })
    }
    const d = (destino || 'TODOS').toUpperCase()
    if (!['TODOS', 'ROL', 'USUARIO'].includes(d)) {
      return NextResponse.json({ error: 'Destino inválido' }, { status: 400 })
    }
    if (d === 'ROL' && !rolNombre) {
      return NextResponse.json({ error: 'Seleccioná un rol' }, { status: 400 })
    }
    if (d === 'USUARIO' && !usuarioId) {
      return NextResponse.json({ error: 'Seleccioná un usuario' }, { status: 400 })
    }

    const creadoPor = (() => {
      try {
        const raw = req.headers.get('x-user')
        return raw ? JSON.parse(raw)?.nombre || null : null
      } catch { return null }
    })()

    const aviso = await db.avisoUsuario.create({
      data: {
        mensaje: mensaje.trim(),
        destino: d,
        usuarioId: d === 'USUARIO' ? usuarioId : null,
        rolNombre: d === 'ROL' ? rolNombre : null,
        creadoPor,
      },
    })

    logAudit({ accion: 'CREATE', entidad: 'AvisoUsuario', entidadId: aviso.id, usuario: creadoPor, detalle: { destino: d } }).catch(() => {})

    return NextResponse.json({ aviso })
  } catch (e) {
    console.error('POST /api/avisos', e)
    return NextResponse.json({ error: 'Error al crear aviso' }, { status: 500 })
  }
}
