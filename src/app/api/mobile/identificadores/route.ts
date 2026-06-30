import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

function getUser(req: NextRequest) {
  const header = req.headers.get('x-user')
  if (!header) return null
  try { return JSON.parse(header) } catch { return null }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cylinderId = searchParams.get('cylinderId')

    const where: any = {}
    if (cylinderId) where.cylinderId = cylinderId

    const identificadores = await db.identificadorTubo.findMany({
      where,
      include: {
        cylinder: {
          include: { gas: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(identificadores)
  } catch (e) {
    console.error('GET /api/mobile/identificadores', e)
    return NextResponse.json({ error: 'Error al listar identificadores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const roleCheck = await requireRole('admin', 'deposito')(req)
    if (roleCheck) return roleCheck

    const user = getUser(req)
    const { cylinderId, tipo, valor } = await req.json()

    if (!cylinderId || !tipo || !valor) {
      return NextResponse.json({ error: 'cylinderId, tipo y valor son requeridos' }, { status: 400 })
    }

    const tiposValidos = ['UHF_EPC', 'UHF_TID', 'NFC_UID', 'NFC_TOKEN', 'QR_TOKEN']
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json({ error: `Tipo inválido. Válidos: ${tiposValidos.join(', ')}` }, { status: 400 })
    }

    const cylinder = await db.cylinder.findUnique({ where: { id: cylinderId } })
    if (!cylinder) {
      return NextResponse.json({ error: 'Tubo no encontrado' }, { status: 404 })
    }

    const existing = await db.identificadorTubo.findUnique({ where: { valor } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un identificador con ese valor' }, { status: 409 })
    }

    const idTubo = await db.identificadorTubo.create({
      data: { cylinderId, tipo, valor },
      include: { cylinder: { include: { gas: true } } },
    })

    await logAudit({
      accion: 'CREATE',
      entidad: 'IdentificadorTubo',
      entidadId: idTubo.id,
      usuario: user?.usuario || 'admin',
      detalle: { cylinderId, tipo, valor },
    })

    return NextResponse.json(idTubo, { status: 201 })
  } catch (e) {
    console.error('POST /api/mobile/identificadores', e)
    return NextResponse.json({ error: 'Error al crear identificador' }, { status: 500 })
  }
}
