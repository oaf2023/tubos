import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// POST /api/routes/[id]/start-navigation
// Marca ruta como EN_PROGRESO, asigna conductor (opcional) y genera token de navegación
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const conductorId = body.conductorId as string | undefined

    const ruta = await db.ruta.findUnique({
      where: { id },
      include: {
        paradas: { orderBy: { orden: 'asc' } },
        vehicle: true,
      },
    })

    if (!ruta) {
      return NextResponse.json({ error: 'Ruta no encontrada' }, { status: 404 })
    }

    // Generar token único para compartir con el chofer
    const token = createHash('sha256')
      .update(`${ruta.id}:${Date.now()}:${ruta.nombre}:${Math.random()}`)
      .digest('hex')
      .substring(0, 16)

    // Marcar como en progreso, asignar conductor y guardar token
    const updateData: Record<string, unknown> = {
      estado: 'EN_PROGRESO',
      navigationToken: token,
      navigationStartedAt: new Date(),
    }
    if (conductorId) updateData.conductorId = conductorId

    await db.ruta.update({
      where: { id },
      data: updateData as any,
    })

    // Construir URL de navegación para el chofer
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const navigationUrl = conductorId
      ? `${baseUrl}/chofer` // App profesional con login
      : `${baseUrl}/navegar/${token}` // Legacy: URL con token

    return NextResponse.json({
      ok: true,
      token,
      navigationUrl,
      conductorAsignado: !!conductorId,
      ruta: {
        id: ruta.id,
        nombre: ruta.nombre,
        paradas: ruta.paradas.map((p) => ({
          id: p.id,
          orden: p.orden,
          nombre: p.nombre,
          lat: p.lat,
          lng: p.lng,
          demandaTubos: p.demandaTubos,
          tipoOperacion: p.tipoOperacion,
        })),
        vehicle: ruta.vehicle ? {
          patente: ruta.vehicle.patente,
          marca: ruta.vehicle.marca,
          modelo: ruta.vehicle.modelo,
        } : null,
      },
    })
  } catch (e) {
    console.error('POST /api/routes/[id]/start-navigation', e)
    return NextResponse.json({ error: 'Error al iniciar navegación' }, { status: 500 })
  }
}
