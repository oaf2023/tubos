-- Migration: F1.6 - Convert money fields from Float to Decimal (numeric)
-- Prisma Decimal → PostgreSQL numeric
-- Ejecutar: \i prisma/migration-decimal.sql (desde psql del servidor)

BEGIN;

ALTER TABLE "RemitoItem" ALTER COLUMN "precioUnitario" TYPE numeric USING "precioUnitario"::numeric;
ALTER TABLE "RemitoItem" ALTER COLUMN "subtotal" TYPE numeric USING "subtotal"::numeric;

ALTER TABLE "Factura" ALTER COLUMN "subtotal" TYPE numeric USING "subtotal"::numeric;
ALTER TABLE "Factura" ALTER COLUMN "descuento" TYPE numeric USING "descuento"::numeric;
ALTER TABLE "Factura" ALTER COLUMN "impuestos" TYPE numeric USING "impuestos"::numeric;
ALTER TABLE "Factura" ALTER COLUMN "total" TYPE numeric USING "total"::numeric;
ALTER TABLE "Factura" ALTER COLUMN "saldoAnterior" TYPE numeric USING "saldoAnterior"::numeric;
ALTER TABLE "Factura" ALTER COLUMN "notasCredito" TYPE numeric USING "notasCredito"::numeric;
ALTER TABLE "Factura" ALTER COLUMN "pagosAplicados" TYPE numeric USING "pagosAplicados"::numeric;
ALTER TABLE "Factura" ALTER COLUMN "totalGeneral" TYPE numeric USING "totalGeneral"::numeric;

ALTER TABLE "FacturaItem" ALTER COLUMN "precioUnitario" TYPE numeric USING "precioUnitario"::numeric;
ALTER TABLE "FacturaItem" ALTER COLUMN "subtotal" TYPE numeric USING "subtotal"::numeric;

ALTER TABLE "Pedido" ALTER COLUMN "total" TYPE numeric USING "total"::numeric;

ALTER TABLE "PedidoItem" ALTER COLUMN "monto" TYPE numeric USING "monto"::numeric;

COMMIT;
