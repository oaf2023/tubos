"""Cabina validation engine."""
import json
from datetime import datetime
from models import (LecturaPeso, EvidenciaFoto, ValidacionCabina, ReglaPeso,
                    Cylinder, Gas, EventoTrazabilidad, Alerta)
from models.base import db

def validate_cylinder(cabina_id: int, cylinder_id: int, peso_kg: float = None, foto_base64: str = None) -> dict:
    cylinder = Cylinder.query.get(cylinder_id)
    if not cylinder:
        return {'valido': False, 'diagnostico': 'Cilindro no encontrado'}

    gas = Gas.query.get(cylinder.gasId) if cylinder.gasId else None
    regla = ReglaPeso.query.filter_by(gasId=cylinder.gasId).first() if cylinder.gasId else None

    peso_id = foto_id = None
    diagnosticos = []

    if peso_kg is not None:
        lectura = LecturaPeso(cabinaId=cabina_id, cylinderId=cylinder_id, pesoKg=peso_kg)
        db.session.add(lectura)
        db.session.flush()
        peso_id = lectura.id

        if regla:
            if regla.pesoMinKg and peso_kg < regla.pesoMinKg:
                diagnosticos.append(f'Peso bajo ({peso_kg}kg < min {regla.pesoMinKg}kg)')
            if regla.pesoMaxKg and peso_kg > regla.pesoMaxKg:
                diagnosticos.append(f'Peso alto ({peso_kg}kg > max {regla.pesoMaxKg}kg)')
        else:
            diagnosticos.append('Sin regla de peso configurada')

    if foto_base64:
        foto = EvidenciaFoto(cabinaId=cabina_id, cylinderId=cylinder_id, imagen=foto_base64)
        db.session.add(foto)
        db.session.flush()
        foto_id = foto.id

    diagnostico_str = '; '.join(diagnosticos) if diagnosticos else 'OK'
    valido = len(diagnosticos) == 0

    validacion = ValidacionCabina(
        cabinaId=cabina_id, cylinderId=cylinder_id,
        lecturaPesoId=peso_id, evidenciaFotoId=foto_id,
        diagnostico=json.dumps({'valido': valido, 'detalle': diagnosticos}),
    )
    db.session.add(validacion)

    evento = EventoTrazabilidad(
        cabinaId=cabina_id, cylinderId=cylinder_id,
        tipo='validacion', descripcion=f'Validación: {diagnostico_str}',
    )
    db.session.add(evento)

    if not valido:
        alerta = Alerta(
            tipo='validacion_fallida', cabinaId=cabina_id,
            cylinderId=cylinder_id, mensaje=diagnostico_str,
            nivel='alta',
        )
        db.session.add(alerta)

    db.session.commit()

    return {
        'valido': valido,
        'diagnostico': diagnostico_str,
        'validacion_id': validacion.id,
    }

def get_cabina_dashboard(cabina_id: int) -> dict:
    ultimas_validaciones = ValidacionCabina.query.filter_by(cabinaId=cabina_id)\
        .order_by(ValidacionCabina.timestamp.desc()).limit(10).all()
    alertas_activas = Alerta.query.filter_by(cabinaId=cabina_id, leida=0)\
        .order_by(Alerta.timestamp.desc()).all()
    eventos_hoy = EventoTrazabilidad.query.filter(
        EventoTrazabilidad.cabinaId == cabina_id,
        EventoTrazabilidad.timestamp >= datetime.utcnow().replace(hour=0, minute=0, second=0),
    ).count()

    return {
        'ultimas_validaciones': [v.to_dict() for v in ultimas_validaciones],
        'alertas_activas': [a.to_dict() for a in alertas_activas],
        'eventos_hoy': eventos_hoy,
    }
