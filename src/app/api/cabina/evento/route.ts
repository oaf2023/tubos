import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.cabinaId || !body.tid) {
      return NextResponse.json({ error: 'cabinaId y tid requeridos' }, { status: 400 })
    }

    const cabina = await db.cabina.findUnique({ where: { id: body.cabinaId } })
    if (!cabina) return NextResponse.json({ error: 'Cabina no encontrada' }, { status: 404 })

    const tag = await db.tagRFID.findUnique({ where: { tid: body.tid } })
    const cylinderId = tag?.cylinderId || null
    let diagnostico = 'OK'
    let alertaMsg: string | null = null
    let pesoReal: number | null = null
    let pesoEsperado: number | null = null
    let estadoFinal: string | null = null

    if (!cylinderId) {
      diagnostico = 'NO_REGISTRADO'
      alertaMsg = `Cilindro no registrado - TID: ${body.tid}`
    } else {
      const cylinder = await db.cylinder.findUnique({
        where: { id: cylinderId },
        include: { gas: true },
      })
      if (cylinder) {
        estadoFinal = cylinder.estado

        if (body.pesoKg) {
          pesoReal = body.pesoKg
          const regla = await db.reglaPeso.findUnique({ where: { gasId: cylinder.gasId } })
          if (regla) {
            if (regla.pesoLlenoKg) pesoEsperado = regla.pesoLlenoKg
            else if (regla.pesoMaxKg) pesoEsperado = regla.pesoMaxKg

            if (pesoReal < (regla.pesoMinKg || 0) * 0.9) {
              diagnostico = 'INCONSISTENCIA'
              alertaMsg = `Peso muy bajo para ${cylinder.gas.codigo}: ${pesoReal}kg (esperado ~${pesoEsperado}kg)`
            }
            const pesoVacio = regla.pesoTaraKg || 0
            if (cylinder.estado === 'LLENO_DISPONIBLE' && pesoReal < pesoVacio * 1.1) {
              diagnostico = 'INCONSISTENCIA'
              alertaMsg = `Cilindro marcado como lleno pero pesa como vacío: ${pesoReal}kg`
            }
          }
        }
      }
    }

    const evento = await db.eventoTrazabilidad.create({
      data: {
        cabinaId: body.cabinaId,
        cylinderId,
        tipo: 'PASO_CABINA',
        descripcion: alertaMsg || `Cilindro procesado en cabina ${cabina.nombre}`,
        usuario: body.usuario || null,
      },
    })

    if (alertaMsg) {
      await db.alerta.create({
        data: {
          tipo: diagnostico === 'NO_REGISTRADO' ? 'CILINDRO_NO_REGISTRADO' : 'INCONSISTENCIA_PESO',
          cabinaId: body.cabinaId,
          cylinderId,
          mensaje: alertaMsg,
          nivel: diagnostico === 'NO_REGISTRADO' ? 'WARNING' : 'CRITICAL',
        },
      })
    }

    const validacion = await db.validacionCabina.create({
      data: {
        cabinaId: body.cabinaId,
        cylinderId,
        pesoRealKg: pesoReal,
        pesoEsperadoKg: pesoEsperado,
        diagnostico,
        estadoFinal,
        alertaGenerada: !!alertaMsg,
      },
    })

    return NextResponse.json({ evento, validacion, diagnostico, alerta: alertaMsg }, { status: 201 })
  } catch (e) {
    console.error('POST /api/cabina/evento', e)
    return NextResponse.json({ error: 'Error al procesar evento de cabina' }, { status: 500 })
  }
}
