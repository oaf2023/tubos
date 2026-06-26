import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validarCilindro } from '@/lib/cabina-engine'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { cabinaId, tid, pesoKg, fotoBase64, phValido, phObservacion, usuario, aplicarCambio } = body

    if (!cabinaId) {
      return NextResponse.json({ error: 'cabinaId requerido' }, { status: 400 })
    }

    const cabina = await db.cabina.findUnique({ where: { id: cabinaId } })
    if (!cabina || !cabina.activo) {
      return NextResponse.json({ error: 'Cabina no encontrada o inactiva' }, { status: 404 })
    }

    const resultado = await validarCilindro({
      cabinaId,
      tid,
      pesoKg: pesoKg ? Number(pesoKg) : undefined,
      fotoBase64,
      phValido: phValido !== undefined ? Boolean(phValido) : undefined,
      phObservacion,
    })

    // Guardar evento de trazabilidad
    const evento = await db.eventoTrazabilidad.create({
      data: {
        cabinaId,
        cylinderId: resultado.cylinderId,
        tipo: 'VALIDACION',
        descripcion: `[${resultado.diagnostico}] ${resultado.alertas.join('; ') || 'Validación OK'}`,
        usuario: usuario || null,
      },
    })

    // Guardar foto si se envió
    let foto = null
    if (fotoBase64 && resultado.cylinderId) {
      foto = await db.evidenciaFoto.create({
        data: {
          cabinaId,
          cylinderId: resultado.cylinderId,
          imagen: fotoBase64,
        },
      })
    }

    // Guardar lectura de peso si se envió
    let lecturaPeso = null
    if (pesoKg && resultado.cylinderId) {
      lecturaPeso = await db.lecturaPeso.create({
        data: {
          cabinaId,
          cylinderId: resultado.cylinderId,
          pesoKg: Number(pesoKg),
        },
      })
    }

    // Guardar validación
    const validacion = await db.validacionCabina.create({
      data: {
        cabinaId,
        cylinderId: resultado.cylinderId,
        lecturaPesoId: lecturaPeso?.id || null,
        evidenciaFotoId: foto?.id || null,
        eventoRfidId: null,
        pesoRealKg: resultado.pesoRealKg,
        pesoEsperadoKg: resultado.pesoEsperadoKg,
        diagnostico: resultado.diagnostico,
        estadoFinal: resultado.estadoSugerido || resultado.estadoActual,
        alertaGenerada: resultado.alertas.length > 0,
      },
    })

    // Aplicar cambio de estado si se solicita
    if (aplicarCambio && resultado.estadoSugerido && resultado.cylinderId) {
      await db.cylinder.update({
        where: { id: resultado.cylinderId },
        data: { estado: resultado.estadoSugerido },
      })
      await logAudit({
        accion: 'CAMBIO_ESTADO',
        entidad: 'Cylinder',
        entidadId: resultado.cylinderId,
        usuario: usuario || 'cabina',
        detalle: {
          desde: resultado.estadoActual,
          hacia: resultado.estadoSugerido,
          cabina: cabina.nombre,
          diagnostico: resultado.diagnostico,
        },
      })
    }

    // Crear alerta si es necesario
    if (resultado.alertas.length > 0 && resultado.cylinderId) {
      await db.alerta.create({
        data: {
          tipo: resultado.diagnostico === 'PH_VENCIDO' ? 'PH_VENCIDO' : 'INCONSISTENCIA_PESO',
          cabinaId,
          cylinderId: resultado.cylinderId,
          mensaje: resultado.alertas.join(' | '),
          nivel: resultado.accion === 'RECHAZAR' ? 'CRITICAL' : 'WARNING',
        },
      })
    }

    return NextResponse.json({
      resultado,
      evento: { id: evento.id },
      validacion: { id: validacion.id },
      foto: foto ? { id: foto.id } : null,
      lecturaPeso: lecturaPeso ? { id: lecturaPeso.id } : null,
    })
  } catch (e) {
    console.error('POST /api/cabina/validar', e)
    return NextResponse.json({ error: 'Error al validar cilindro en cabina' }, { status: 500 })
  }
}
