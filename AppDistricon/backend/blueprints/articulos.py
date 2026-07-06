from flask import Blueprint, request, jsonify
from models.base import db
from auth.decorators import login_required
from sqlalchemy import text

articulos_bp = Blueprint('articulos_bp', __name__)

TABLE = "data_05012015_GR2_300"

ALLOWED_FILTERS = [
    'ART_CODI', 'ART_DET1', 'ART_COD1', 'ART_COD2', 'ART_COD3',
    'ART_MARC', 'ART_RUBR', 'ART_SUBR', 'ART_DPTO', 'ART_TIVA',
    'ART_UNID', 'ART_OFER',
]

COLUMNS = [
    'ART_CODI', 'ART_DET1', 'ART_COD1', 'ART_COD2', 'ART_COD3',
    'ART_COD4', 'ART_COD5', 'ART_DET2', 'ART_DET3', 'ART_DET4',
    'ART_DCOR', 'ART_PRE1', 'ART_PRE2', 'ART_PRE3', 'ART_PRE4',
    'ART_UTI1', 'ART_UTI2', 'ART_UTI3', 'ART_UTI4', 'ART_COST',
    'ART_COSR', 'ART_TIVA', 'ART_TIMP', 'ART_DTCA', 'ART_DEP1',
    'ART_DEP2', 'ART_DEP3', 'ART_DEP4', 'ART_DEP5', 'ART_DEP6',
    'ART_SMIN', 'ART_SMAX', 'ART_CONS', 'ART_PACK', 'ART_TIPO',
    'ART_DPTO', 'ART_RUBR', 'ART_SUBR', 'ART_MARC', 'ART_UNIN',
    'ART_CCNU', 'ART_COMI', 'ART_FUCO', 'ART_UCAN', 'ART_NUPR',
    'ART_NOPR', 'ART_UNID', 'ART_COMB', 'ART_OFER', 'ART_BALA',
    'ART_ETIQ', 'ART_FVEN', 'ART_TENV', 'ART_FACT', 'ART_VOFE',
    'ART_POFE', 'ART_CCNO', 'ART_DPTC', 'ART_RUBC', 'ART_SUBC',
    'ART_MARN', 'ART_ENVA', 'ART_OPER', 'ART_NOVE', 'ART_LIST',
    'ART_DTO1', 'ART_DTO2', 'ART_DTO3', 'ART_DTOG', 'ART_FLET',
    'COM_COMP', 'ART_WHAB', 'ART_WDAD', 'ART_WLIN', 'ART_WOBS',
    'ART_UPRE', 'ART_STIN', 'ART_TGNU', 'ART_TGNO', 'ART_DEST',
    'ART_VPRE', 'ART_VWEB', 'ART_IMCO', 'ART_BDIA', 'ART_NOST',
    'ART_PRE5', 'ART_UTI5', 'ART_LDOM', 'ART_TDVE', 'ART_DTCV',
    'ART_CANU', 'ART_CANB', 'ART_DACU', 'ART_DTO4', 'ART_DTO5',
    'ART_DTO6', 'ART_DTOA', 'ART_MOFE',
]

COL_SET = {c.lower() for c in COLUMNS}


def row_to_dict(row):
    return {col: row[i] for i, col in enumerate(COLUMNS)}


@articulos_bp.route('/api/articulos', methods=['GET'])
@login_required
def list_articulos():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 200)
    search = request.args.get('search', '').strip()
    sort_by = request.args.get('sort_by', 'ART_CODI')
    sort_dir = request.args.get('sort_dir', 'asc')

    if sort_by.upper() not in COL_SET:
        sort_by = 'ART_CODI'
    sort_dir = 'DESC' if sort_dir.lower() == 'desc' else 'ASC'

    base = f"SELECT * FROM [{TABLE}]"
    count_base = f"SELECT COUNT(*) FROM [{TABLE}]"
    where_parts = []

    if search:
        try:
            num = int(search)
            where_parts.append(f"(ART_CODI = {num} OR ART_COD1 LIKE '%{search}%' OR ART_COD2 LIKE '%{search}%')")
        except ValueError:
            safe = search.replace("'", "''")
            where_parts.append(
                f"(ART_DET1 LIKE '%{safe}%' OR ART_COD1 LIKE '%{safe}%' "
                f"OR ART_COD2 LIKE '%{safe}%' OR ART_COD3 LIKE '%{safe}%')"
            )

    for f in ALLOWED_FILTERS:
        val = request.args.get(f.lower())
        if val:
            try:
                num_val = int(val)
                where_parts.append(f"{f} = {num_val}")
            except ValueError:
                safe = val.replace("'", "''")
                where_parts.append(f"{f} = '{safe}'")

    where = ""
    if where_parts:
        where = " WHERE " + " AND ".join(where_parts)

    total = db.session.execute(text(count_base + where)).scalar() or 0
    offset = (page - 1) * per_page

    query = f"{base}{where} ORDER BY {sort_by} {sort_dir} LIMIT {per_page} OFFSET {offset}"
    rows = db.session.execute(text(query)).fetchall()

    return jsonify({
        'data': [row_to_dict(r) for r in rows],
        'total': total,
        'page': page,
        'per_page': per_page,
    })


@articulos_bp.route('/api/articulos/<int:id>', methods=['GET'])
@login_required
def get_articulo(id):
    row = db.session.execute(
        text(f"SELECT * FROM [{TABLE}] WHERE ART_CODI = :id"), {'id': id}
    ).fetchone()
    if not row:
        return jsonify({'error': 'No encontrado'}), 404
    return jsonify(row_to_dict(row))


@articulos_bp.route('/api/articulos', methods=['POST'])
@login_required
def create_articulo():
    data = request.get_json()
    if not data or 'ART_CODI' not in data:
        return jsonify({'error': 'ART_CODI requerido'}), 400

    existing = db.session.execute(
        text(f"SELECT ART_CODI FROM [{TABLE}] WHERE ART_CODI = :id"),
        {'id': data['ART_CODI']}
    ).fetchone()
    if existing:
        return jsonify({'error': 'Ya existe un artículo con ese código'}), 409

    cols = []
    vals = []
    params = {}
    for c in COLUMNS:
        if c in data and data[c] is not None:
            cols.append(c)
            vals.append(f":{c}")
            params[c] = data[c]

    if not cols:
        return jsonify({'error': 'Sin datos para insertar'}), 400

    sql = f"INSERT INTO [{TABLE}] ({','.join(cols)}) VALUES ({','.join(vals)})"
    db.session.execute(text(sql), params)
    db.session.commit()

    return jsonify({'message': 'Artículo creado', 'ART_CODI': data['ART_CODI']}), 201


@articulos_bp.route('/api/articulos/<int:id>', methods=['PUT'])
@login_required
def update_articulo(id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Sin datos'}), 400

    existing = db.session.execute(
        text(f"SELECT ART_CODI FROM [{TABLE}] WHERE ART_CODI = :id"), {'id': id}
    ).fetchone()
    if not existing:
        return jsonify({'error': 'No encontrado'}), 404

    sets = []
    params = {'id': id}
    for c in COLUMNS:
        if c in data:
            sets.append(f"{c} = :{c}")
            params[c] = data[c]

    if not sets:
        return jsonify({'error': 'Sin campos para actualizar'}), 400

    sql = f"UPDATE [{TABLE}] SET {','.join(sets)} WHERE ART_CODI = :id"
    db.session.execute(text(sql), params)
    db.session.commit()

    return jsonify({'message': 'Artículo actualizado'})


@articulos_bp.route('/api/articulos/<int:id>', methods=['DELETE'])
@login_required
def delete_articulo(id):
    existing = db.session.execute(
        text(f"SELECT ART_CODI FROM [{TABLE}] WHERE ART_CODI = :id"), {'id': id}
    ).fetchone()
    if not existing:
        return jsonify({'error': 'No encontrado'}), 404

    db.session.execute(text(f"DELETE FROM [{TABLE}] WHERE ART_CODI = :id"), {'id': id})
    db.session.commit()

    return jsonify({'message': 'Artículo eliminado'})


@articulos_bp.route('/api/articulos/stats', methods=['GET'])
@login_required
def articulos_stats():
    total = db.session.execute(text(f"SELECT COUNT(*) FROM [{TABLE}]")).scalar() or 0
    con_stock = db.session.execute(text(f"SELECT COUNT(*) FROM [{TABLE}] WHERE ART_STIN > 0")).scalar() or 0

    low_stock = db.session.execute(
        text(f"SELECT ART_CODI, ART_DET1, ART_STIN, ART_SMIN, ART_UNID FROM [{TABLE}] WHERE ART_SMIN > 0 AND (ART_STIN IS NULL OR ART_STIN < ART_SMIN) ORDER BY ART_STIN ASC NULLS FIRST LIMIT 20")
    ).fetchall()

    by_marca = db.session.execute(
        text(f"SELECT ART_MARC, COUNT(*) as cnt FROM [{TABLE}] WHERE ART_MARC IS NOT NULL GROUP BY ART_MARC ORDER BY cnt DESC LIMIT 15")
    ).fetchall()

    by_rubro = db.session.execute(
        text(f"SELECT ART_RUBR, COUNT(*) as cnt FROM [{TABLE}] WHERE ART_RUBR IS NOT NULL GROUP BY ART_RUBR ORDER BY cnt DESC LIMIT 15")
    ).fetchall()

    by_subrubro = db.session.execute(
        text(f"SELECT ART_SUBR, COUNT(*) as cnt FROM [{TABLE}] WHERE ART_SUBR IS NOT NULL GROUP BY ART_SUBR ORDER BY cnt DESC LIMIT 15")
    ).fetchall()

    by_dpto = db.session.execute(
        text(f"SELECT ART_DPTO, COUNT(*) as cnt FROM [{TABLE}] WHERE ART_DPTO IS NOT NULL GROUP BY ART_DPTO ORDER BY cnt DESC LIMIT 15")
    ).fetchall()

    by_unid = db.session.execute(
        text(f"SELECT ART_UNID, COUNT(*) as cnt FROM [{TABLE}] WHERE ART_UNID IS NOT NULL AND ART_UNID != '' GROUP BY ART_UNID ORDER BY cnt DESC")
    ).fetchall()

    total_valor = db.session.execute(
        text(f"SELECT COALESCE(SUM(ART_PRE1 * COALESCE(ART_STIN, 0)), 0) FROM [{TABLE}]")
    ).scalar() or 0

    precio_ranges = db.session.execute(
        text(f"SELECT CASE WHEN ART_PRE1 IS NULL OR ART_PRE1 = 0 THEN 'Sin precio' WHEN ART_PRE1 < 100 THEN '0-100' WHEN ART_PRE1 < 500 THEN '100-500' WHEN ART_PRE1 < 2000 THEN '500-2K' WHEN ART_PRE1 < 10000 THEN '2K-10K' ELSE '10K+' END as rango, COUNT(*) as cnt FROM (SELECT ART_PRE1 FROM [{TABLE}]) GROUP BY rango ORDER BY rango")
    ).fetchall()

    return jsonify({
        'total': total,
        'conStock': con_stock,
        'sinStock': total - con_stock,
        'totalValor': float(total_valor),
        'lowStock': [
            {'ART_CODI': r[0], 'ART_DET1': r[1], 'ART_STIN': r[2], 'ART_SMIN': r[3], 'ART_UNID': r[4]}
            for r in low_stock
        ],
        'byMarca': [{'codigo': r[0], 'cantidad': r[1]} for r in by_marca],
        'byRubro': [{'codigo': r[0], 'cantidad': r[1]} for r in by_rubro],
        'bySubrubro': [{'codigo': r[0], 'cantidad': r[1]} for r in by_subrubro],
        'byDpto': [{'codigo': r[0], 'cantidad': r[1]} for r in by_dpto],
        'byUnidad': [{'unidad': r[0], 'cantidad': r[1]} for r in by_unid],
        'precioRanges': [{'rango': r[0], 'cantidad': r[1]} for r in precio_ranges],
    })


@articulos_bp.route('/api/articulos/export/csv', methods=['GET'])
@login_required
def export_articulos_csv():
    rows = db.session.execute(text(f"SELECT * FROM [{TABLE}] ORDER BY ART_CODI")).fetchall()
    lines = [','.join(COLUMNS)]
    for r in rows:
        vals = []
        for i, c in enumerate(COLUMNS):
            v = r[i]
            if v is None:
                vals.append('')
            else:
                s = str(v).replace('"', '""')
                if ',' in s or '"' in s or '\n' in s:
                    vals.append(f'"{s}"')
                else:
                    vals.append(s)
        lines.append(','.join(vals))
    return '\n'.join(lines), 200, {'Content-Type': 'text/csv; charset=utf-8'}
