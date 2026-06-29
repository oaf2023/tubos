-- Safe enum migration: ALTER TYPE instead of DROP/ADD (preserves all data)
-- Run with: npx prisma db execute --file=prisma/migration-enums-safe.sql

-- Create all enum types first
CREATE TYPE "EstadoCilindro" AS ENUM ('LLENO', 'VACIO', 'EN_CLIENTE', 'EN_REPARTO', 'EN_CARGA', 'EN_DEPOSITO', 'MANTENIMIENTO', 'RETENIDO', 'PH_VENCIDO', 'BAJA', 'EXTRAVIADO');
CREATE TYPE "ResultadoInspeccion" AS ENUM ('APROBADO', 'RECHAZADO', 'CONDENADO');
CREATE TYPE "MetodoPrueba" AS ENUM ('HIDROSTATICA', 'ULTRASONIDO', 'PRESION_PRUEBA');
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'COMPLETADO', 'CANCELADO');
CREATE TYPE "EstadoCuentaCliente" AS ENUM ('AL_DIA', 'PENDIENTE', 'MOROSO');
CREATE TYPE "EstadoCliente" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'INACTIVO');
CREATE TYPE "EstadoRuta" AS ENUM ('PLANIFICADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA');
CREATE TYPE "EstadoParada" AS ENUM ('PENDIENTE', 'ENTREGADO', 'EN_PROGRESO');
CREATE TYPE "TipoOperacionParada" AS ENUM ('ENTREGA', 'RETIRO', 'CANJE');
CREATE TYPE "TipoRemito" AS ENUM ('ENTREGA', 'DEVOLUCION', 'CAMBIO');
CREATE TYPE "EstadoRemito" AS ENUM ('PENDIENTE', 'COMPLETADO', 'PARCIAL');
CREATE TYPE "TipoOperacionItemRemito" AS ENUM ('ALQUILER', 'VENTA', 'CAMBIO', 'DEVOLUCION');
CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA', 'ANULADA', 'BORRADOR');
CREATE TYPE "TipoItemFactura" AS ENUM ('ALQUILER', 'GAS', 'FLETE', 'PENALIZACION', 'DESCUENTO', 'OTRO');
CREATE TYPE "EstadoVehiculo" AS ENUM ('ACTIVO', 'EN_TALLER', 'BAJA', 'RESERVA');
CREATE TYPE "TipoVehiculo" AS ENUM ('AUTO', 'CAMIONETA', 'CAMION', 'BUS', 'MAQUINARIA', 'MONTACARGA', 'MOTO', 'OTRO');
CREATE TYPE "CombustibleVehiculo" AS ENUM ('NAFTA', 'GASOIL', 'GNC', 'ELECTRICO', 'HIBRIDO', 'OTRO');
CREATE TYPE "OrientacionTubos" AS ENUM ('PARADOS', 'ACOSTADOS');
CREATE TYPE "EstadoCargaVehiculo" AS ENUM ('ACTIVA', 'COMPLETADA', 'CANCELADA');
CREATE TYPE "TipoMantenimientoVehiculo" AS ENUM ('PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO');
CREATE TYPE "EstadoMantenimiento" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO');
CREATE TYPE "EstadoDocumentoVehiculo" AS ENUM ('VIGENTE', 'VENCIDO', 'PROXIMO_A_VENCER');
CREATE TYPE "TipoDocumentoVehicular" AS ENUM ('REVISION_TECNICA', 'PERMISO_CIRCULACION', 'SEGURO', 'LICENCIA', 'OTRO');
CREATE TYPE "TipoCargaCombustible" AS ENUM ('CARGA', 'CARGA_ELECTRICA');
CREATE TYPE "EstadoReparto" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO');
CREATE TYPE "EstadoCilindroCliente" AS ENUM ('ALQUILADO', 'PROPIETARIO', 'CONSIGNACION');
CREATE TYPE "DiagnosticoValidacion" AS ENUM ('OK', 'INCONSISTENCIA', 'NO_REGISTRADO', 'SOSPECHOSO');
CREATE TYPE "FuenteGPS" AS ENUM ('GPS', 'MANUAL', 'SIMULADO');
CREATE TYPE "CategoriaGas" AS ENUM ('INERTE', 'ACTIVO', 'COMBUSTIBLE', 'COMBURENTE');
CREATE TYPE "PeligroGas" AS ENUM ('INFLAMABLE', 'COMBURENTE', 'GAS_PRESION', 'NINGUNO');
CREATE TYPE "NivelAlerta" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "TipoAlerta" AS ENUM ('CILINDRO_NO_REGISTRADO', 'INCONSISTENCIA_PESO', 'ZONA_NO_AUTORIZADA', 'LECTURA_MULTIPLE', 'OTRO');
CREATE TYPE "TipoEventoTrazabilidad" AS ENUM ('PASO_CABINA', 'VALIDACION', 'ALERTA', 'INGRESO', 'EGRESO');
CREATE TYPE "TipoObservacion" AS ENUM ('IMAGEN', 'VIDEO', 'NOTA', 'AUDIO');
CREATE TYPE "TipoArchivoObservacion" AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE "TipoGeocerca" AS ENUM ('DEPOSITO', 'CLIENTE', 'RESTRINGIDA', 'ENTREGA');
CREATE TYPE "TipoZonaLectura" AS ENUM ('VACIOS', 'LLENOS', 'SALIDA_REPARTO', 'ENVIO_CARGA', 'RECEPCION_CARGA', 'MANTENIMIENTO', 'BAJA');
CREATE TYPE "TipoLector" AS ENUM ('ESP32', 'RPI', 'GATEWAY');
CREATE TYPE "TipoSensorCabina" AS ENUM ('RFID', 'BALANZA', 'CAMARA', 'UPS');
CREATE TYPE "TipoUbicacion" AS ENUM ('BASE', 'CLIENTE', 'SUCURSAL', 'ALIADO');
CREATE TYPE "TipoMovimiento" AS ENUM ('CARGA', 'DESCARGA', 'TRASLADO', 'INSPECCION', 'REPARACION', 'ALTA', 'BAJA');
CREATE TYPE "TipoMantenimiento" AS ENUM ('CAMBIO_VALVULA', 'PINTURA', 'CAMBIO_GAS', 'REPARACION', 'INSPECCION', 'OTRO');
CREATE TYPE "OperacionEnvase" AS ENUM ('CANJE', 'VENTA_NUEVO', 'SIN_ENVASE');
CREATE TYPE "TipoMovimientoStock" AS ENUM ('ENTRADA', 'SALIDA', 'TRANSFERENCIA');
CREATE TYPE "OrigenEventoRFID" AS ENUM ('AUTOMATICO', 'MANUAL');
CREATE TYPE "AccionAudit" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CAMBIO_ESTADO');

-- Safe ALTER COLUMN with USING cast (preserves existing data)
ALTER TABLE "Alerta" ALTER COLUMN "tipo" TYPE "TipoAlerta" USING "tipo"::text::"TipoAlerta";
ALTER TABLE "Alerta" ALTER COLUMN "nivel" TYPE "NivelAlerta" USING "nivel"::text::"NivelAlerta";
ALTER TABLE "AuditLog" ALTER COLUMN "accion" TYPE "AccionAudit" USING "accion"::text::"AccionAudit";

ALTER TABLE "CargaCombustible" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "CargaCombustible" ALTER COLUMN "tipo" TYPE "TipoCargaCombustible" USING "tipo"::text::"TipoCargaCombustible";
ALTER TABLE "CargaCombustible" ALTER COLUMN "tipo" SET DEFAULT 'CARGA';

ALTER TABLE "CargaVehiculo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "CargaVehiculo" ALTER COLUMN "estado" TYPE "EstadoCargaVehiculo" USING "estado"::text::"EstadoCargaVehiculo";
ALTER TABLE "CargaVehiculo" ALTER COLUMN "estado" SET DEFAULT 'ACTIVA';

ALTER TABLE "Cliente" ALTER COLUMN "estadoCuenta" TYPE "EstadoCuentaCliente" USING "estadoCuenta"::text::"EstadoCuentaCliente";

ALTER TABLE "Cliente" ALTER COLUMN "estadoCliente" DROP DEFAULT;
ALTER TABLE "Cliente" ALTER COLUMN "estadoCliente" TYPE "EstadoCliente" USING "estadoCliente"::text::"EstadoCliente";
ALTER TABLE "Cliente" ALTER COLUMN "estadoCliente" SET DEFAULT 'ACTIVO';

ALTER TABLE "Cylinder" ALTER COLUMN "resultadoInspeccion" DROP DEFAULT;
ALTER TABLE "Cylinder" ALTER COLUMN "resultadoInspeccion" TYPE "ResultadoInspeccion" USING "resultadoInspeccion"::text::"ResultadoInspeccion";
ALTER TABLE "Cylinder" ALTER COLUMN "resultadoInspeccion" SET DEFAULT 'APROBADO';

ALTER TABLE "Cylinder" ALTER COLUMN "metodoPrueba" TYPE "MetodoPrueba" USING "metodoPrueba"::text::"MetodoPrueba";

ALTER TABLE "Cylinder" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Cylinder" ALTER COLUMN "estado" TYPE "EstadoCilindro" USING "estado"::text::"EstadoCilindro";
ALTER TABLE "Cylinder" ALTER COLUMN "estado" SET DEFAULT 'LLENO';

ALTER TABLE "CylinderMovimiento" ALTER COLUMN "tipo" TYPE "TipoMovimiento" USING "tipo"::text::"TipoMovimiento";
ALTER TABLE "DocumentoVehiculo" ALTER COLUMN "tipo" TYPE "TipoDocumentoVehicular" USING "tipo"::text::"TipoDocumentoVehicular";

ALTER TABLE "DocumentoVehiculo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "DocumentoVehiculo" ALTER COLUMN "estado" TYPE "EstadoDocumentoVehiculo" USING "estado"::text::"EstadoDocumentoVehiculo";
ALTER TABLE "DocumentoVehiculo" ALTER COLUMN "estado" SET DEFAULT 'VIGENTE';

ALTER TABLE "Factura" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Factura" ALTER COLUMN "estado" TYPE "EstadoFactura" USING "estado"::text::"EstadoFactura";
ALTER TABLE "Factura" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

ALTER TABLE "FacturaItem" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "FacturaItem" ALTER COLUMN "tipo" TYPE "TipoItemFactura" USING "tipo"::text::"TipoItemFactura";
ALTER TABLE "FacturaItem" ALTER COLUMN "tipo" SET DEFAULT 'ALQUILER';

ALTER TABLE "Gas" ALTER COLUMN "categoria" TYPE "CategoriaGas" USING "categoria"::text::"CategoriaGas";

ALTER TABLE "Gas" ALTER COLUMN "peligro" DROP DEFAULT;
ALTER TABLE "Gas" ALTER COLUMN "peligro" TYPE "PeligroGas" USING "peligro"::text::"PeligroGas";
ALTER TABLE "Gas" ALTER COLUMN "peligro" SET DEFAULT 'GAS_PRESION';

ALTER TABLE "Geocerca" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "Geocerca" ALTER COLUMN "tipo" TYPE "TipoGeocerca" USING "tipo"::text::"TipoGeocerca";
ALTER TABLE "Geocerca" ALTER COLUMN "tipo" SET DEFAULT 'DEPOSITO';

ALTER TABLE "LectorIoT" ALTER COLUMN "tipo" TYPE "TipoLector" USING "tipo"::text::"TipoLector";
ALTER TABLE "Location" ALTER COLUMN "tipo" TYPE "TipoUbicacion" USING "tipo"::text::"TipoUbicacion";
ALTER TABLE "Mantenimiento" ALTER COLUMN "tipo" TYPE "TipoMantenimiento" USING "tipo"::text::"TipoMantenimiento";
ALTER TABLE "MantenimientoVehiculo" ALTER COLUMN "tipo" TYPE "TipoMantenimientoVehiculo" USING "tipo"::text::"TipoMantenimientoVehiculo";

ALTER TABLE "MantenimientoVehiculo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "MantenimientoVehiculo" ALTER COLUMN "estado" TYPE "EstadoMantenimiento" USING "estado"::text::"EstadoMantenimiento";
ALTER TABLE "MantenimientoVehiculo" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

ALTER TABLE "Pedido" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Pedido" ALTER COLUMN "estado" TYPE "EstadoPedido" USING "estado"::text::"EstadoPedido";
ALTER TABLE "Pedido" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

ALTER TABLE "Remito" ALTER COLUMN "tipo" TYPE "TipoRemito" USING "tipo"::text::"TipoRemito";

ALTER TABLE "Remito" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Remito" ALTER COLUMN "estado" TYPE "EstadoRemito" USING "estado"::text::"EstadoRemito";
ALTER TABLE "Remito" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

ALTER TABLE "RemitoItem" ALTER COLUMN "tipoOperacion" TYPE "TipoOperacionItemRemito" USING "tipoOperacion"::text::"TipoOperacionItemRemito";

ALTER TABLE "Reparto" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Reparto" ALTER COLUMN "estado" TYPE "EstadoReparto" USING "estado"::text::"EstadoReparto";
ALTER TABLE "Reparto" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE';

ALTER TABLE "Ruta" ALTER COLUMN "estado" TYPE "EstadoRuta" USING "estado"::text::"EstadoRuta";
ALTER TABLE "RutaParada" ALTER COLUMN "estado" TYPE "EstadoParada" USING "estado"::text::"EstadoParada";

ALTER TABLE "RutaParada" ALTER COLUMN "tipoOperacion" DROP DEFAULT;
ALTER TABLE "RutaParada" ALTER COLUMN "tipoOperacion" TYPE "TipoOperacionParada" USING "tipoOperacion"::text::"TipoOperacionParada";
ALTER TABLE "RutaParada" ALTER COLUMN "tipoOperacion" SET DEFAULT 'ENTREGA';

ALTER TABLE "UbicacionGPS" ALTER COLUMN "fuente" DROP DEFAULT;
ALTER TABLE "UbicacionGPS" ALTER COLUMN "fuente" TYPE "FuenteGPS" USING "fuente"::text::"FuenteGPS";
ALTER TABLE "UbicacionGPS" ALTER COLUMN "fuente" SET DEFAULT 'GPS';

ALTER TABLE "ValidacionCabina" ALTER COLUMN "diagnostico" DROP DEFAULT;
ALTER TABLE "ValidacionCabina" ALTER COLUMN "diagnostico" TYPE "DiagnosticoValidacion" USING "diagnostico"::text::"DiagnosticoValidacion";
ALTER TABLE "ValidacionCabina" ALTER COLUMN "diagnostico" SET DEFAULT 'OK';

ALTER TABLE "Vehiculo" ALTER COLUMN "tipo" TYPE "TipoVehiculo" USING "tipo"::text::"TipoVehiculo";
ALTER TABLE "Vehiculo" ALTER COLUMN "combustible" TYPE "CombustibleVehiculo" USING "combustible"::text::"CombustibleVehiculo";

ALTER TABLE "Vehiculo" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Vehiculo" ALTER COLUMN "estado" TYPE "EstadoVehiculo" USING "estado"::text::"EstadoVehiculo";
ALTER TABLE "Vehiculo" ALTER COLUMN "estado" SET DEFAULT 'ACTIVO';

ALTER TABLE "Vehiculo" ALTER COLUMN "orientacionTubos" DROP DEFAULT;
ALTER TABLE "Vehiculo" ALTER COLUMN "orientacionTubos" TYPE "OrientacionTubos" USING "orientacionTubos"::text::"OrientacionTubos";
ALTER TABLE "Vehiculo" ALTER COLUMN "orientacionTubos" SET DEFAULT 'PARADOS';

ALTER TABLE "ZonaLectura" ALTER COLUMN "tipo" TYPE "TipoZonaLectura" USING "tipo"::text::"TipoZonaLectura";
