-- Migration: F1.8 - Add S3/object storage URL fields
-- Ejecutar: \i prisma/migration-object-storage.sql

BEGIN;

ALTER TABLE "EvidenciaFoto" ADD COLUMN IF NOT EXISTS "archivoUrl" TEXT;
ALTER TABLE "EvidenciaFotoCabina" ADD COLUMN IF NOT EXISTS "imagenUrl" TEXT;

COMMIT;
