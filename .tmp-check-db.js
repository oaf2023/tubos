const { Client } = require('pg');
const conn = 'postgresql://gastrack_o9al_user:lAqWfHcELgIP60IGVSVApMIGAw1oSteI@dpg-d8vdcu67r5hc73eepr6g-a.oregon-postgres.render.com:5432/gastrack_o9al';

const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
  // Check enums
  const enums = await client.query("SELECT typname FROM pg_type WHERE typname LIKE '%Estado%' OR typname LIKE '%Tipo%' OR typname LIKE '%Categoria%' OR typname LIKE '%Peligro%' OR typname LIKE '%Accion%' ORDER BY typname");
  console.log('=== Enums in DB ===');
  enums.rows.forEach(r => console.log(r.typname));

  // Check if Decimal columns migrated
  const cols = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('Pedido', 'PedidoItem', 'Factura', 'FacturaItem', 'RemitoItem')
      AND column_name IN ('total', 'monto', 'subtotal', 'descuento', 'impuestos', 'saldoAnterior', 'notasCredito', 'pagosAplicados', 'totalGeneral', 'precioUnitario')
    ORDER BY table_name, column_name
  `);
  console.log('\n=== Decimal columns ===');
  cols.rows.forEach(r => console.log(`${r.table_name}.${r.column_name}: ${r.data_type}`));

  await client.end();
}).catch(e => console.error('Error:', e.message));
