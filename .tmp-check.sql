SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'IdempotencyKey') AS idempotency_key_exists;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('Pedido', 'Factura')
  AND column_name IN ('total', 'subtotal')
ORDER BY table_name, column_name;
