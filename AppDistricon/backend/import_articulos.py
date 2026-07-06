"""Import articles CSV into Flask app database (tubos.db)."""
import csv
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models.base import db

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'csv', 'data_05012015_GR2_300.csv')
TABLE = "data_05012015_GR2_300"

app = create_app()

with app.app_context():
    # Drop table if exists, then recreate
    db.session.execute(db.text(f"DROP TABLE IF EXISTS [{TABLE}]"))
    db.session.commit()

    # Read CSV header
    with open(CSV_PATH, encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        headers = next(reader)
        # Clean BOM from first header
        headers = [h.strip() for h in headers]

    if not headers:
        print("ERROR: CSV has no columns")
        sys.exit(1)

    print(f"Columns ({len(headers)}): {', '.join(headers)}")
    print(f"Importing from: {CSV_PATH}")

    # Create table dynamically
    col_defs = ', '.join(f"[{h}] TEXT" for h in headers)
    db.session.execute(db.text(f"DROP TABLE IF EXISTS [{TABLE}]"))
    db.session.execute(db.text(f"CREATE TABLE [{TABLE}] ({col_defs})"))
    db.session.commit()

    # Insert data in batches
    batch_size = 500
    total = 0
    placeholders = ', '.join(f":{h}" for h in headers)
    insert_sql = f"INSERT INTO [{TABLE}] ({', '.join(f'[{h}]' for h in headers)}) VALUES ({placeholders})"

    with open(CSV_PATH, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        batch = []
        for row in reader:
            clean = {}
            for h in headers:
                val = row.get(h, '')
                if val == '':
                    clean[h] = None
                else:
                    clean[h] = val
            batch.append(clean)
            total += 1

            if len(batch) >= batch_size:
                db.session.execute(db.text(insert_sql), batch)
                db.session.commit()
                batch = []
                print(f"  {total} records imported...")

        if batch:
            db.session.execute(db.text(insert_sql), batch)
            db.session.commit()

    print(f"\nDone. {total} records imported into [{TABLE}]")
