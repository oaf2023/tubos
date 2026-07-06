"""RFID session management & business rules."""
from datetime import datetime
from models import EventoRFID, SesionLecturaRFID, TagRFID, Cylinder
from models.base import db

def process_event(tid: str, lector_id: int, zona_id: int, estado_nuevo: str):
    tag = TagRFID.query.filter_by(tid=tid).first()
    cylinder_id = tag.cylinderId if tag else None

    last_event = EventoRFID.query.filter_by(tid=tid).order_by(EventoRFID.timestamp.desc()).first()
    estado_anterior = last_event.estadoNuevo if last_event else 'unknown'

    event = EventoRFID(
        tid=tid, lectorId=lector_id, zonaId=zona_id,
        timestamp=datetime.utcnow(),
        estadoAnterior=estado_anterior, estadoNuevo=estado_nuevo,
    )
    db.session.add(event)

    session = SesionLecturaRFID.query.filter_by(
        lectorId=lector_id, zonaId=zona_id, tid=tid,
        procesado=0,
    ).first()
    if session:
        session.fin = datetime.utcnow()
        session.conteo = (session.conteo or 0) + 1
    else:
        session = SesionLecturaRFID(
            lectorId=lector_id, zonaId=zona_id, tid=tid,
            cylinderId=cylinder_id, inicio=datetime.utcnow(), conteo=1,
        )
        db.session.add(session)

    db.session.commit()
    return event

def get_active_sessions(lector_id: int = None, zona_id: int = None):
    q = SesionLecturaRFID.query.filter_by(procesado=0)
    if lector_id:
        q = q.filter_by(lectorId=lector_id)
    if zona_id:
        q = q.filter_by(zonaId=zona_id)
    return q.all()

def close_session(session_id: int):
    session = SesionLecturaRFID.query.get(session_id)
    if not session:
        return None
    session.fin = datetime.utcnow()
    session.procesado = 1
    db.session.commit()
    return session
