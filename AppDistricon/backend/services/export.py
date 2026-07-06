"""Server-side export services (CSV)."""
import csv
import io
from datetime import datetime

def export_csv(rows: list[dict], filename: str = 'export.csv'):
    if not rows:
        return None, None
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    csv_content = output.getvalue()
    return csv_content, filename

def export_kpis_csv(kpis: dict) -> tuple:
    rows = []
    for group, label in [('comerciales', 'Comerciales'), ('financieros', 'Financieros'), ('operativos', 'Operativos')]:
        data = kpis.get(group, {})
        for key, val in data.items():
            if isinstance(val, dict):
                rows.append({'Grupo': label, 'Indicador': key,
                             'Valor': val.get('value', ''), 'Estado': val.get('estado', '')})
            else:
                rows.append({'Grupo': label, 'Indicador': key, 'Valor': str(val), 'Estado': ''})
    return export_csv(rows, f'reporte-kpis-{datetime.now().strftime("%Y-%m-%d")}.csv')

def export_conciliacion_csv(rows: list[dict]) -> tuple:
    return export_csv(rows, f'conciliacion-{datetime.now().strftime("%Y-%m-%d")}.csv')
