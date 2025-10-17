-- Script para crear la tabla de módulo de garantizado
-- Incluye todas las columnas del frontend más flota_id y semana

CREATE TABLE yego_garantizado (
    yeg_gara_id SERIAL PRIMARY KEY,
    yeg_gara_nombre_completo VARCHAR(255) NOT NULL,
    yeg_gara_numero_licencia VARCHAR(50) NOT NULL UNIQUE,
    yeg_gara_telefono VARCHAR(20),
    yeg_gara_viajes INTEGER DEFAULT 0,
    yeg_gara_efectivo DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_pago_sin_efectivo DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_com_yango DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_com_yego DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_bo_sem_ant DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_bo_sem_act DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_total DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_garantizado DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_diferencia DECIMAL(10,2) DEFAULT 0.00,
    yeg_gara_semana VARCHAR(20) NOT NULL,
    yeg_gara_viajes_actuales INTEGER DEFAULT 0,
    yeg_gara_flota VARCHAR(20),
    yeg_gara_flota_id INTEGER,
    yeg_gara_fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    yeg_gara_fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    yeg_gara_activo BOOLEAN DEFAULT TRUE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_yego_garantizado_flota ON yego_garantizado(yeg_gara_flota);
CREATE INDEX idx_yego_garantizado_semana ON yego_garantizado(yeg_gara_semana);
CREATE INDEX idx_yego_garantizado_flota_id ON yego_garantizado(yeg_gara_flota_id);
CREATE INDEX idx_yego_garantizado_licencia ON yego_garantizado(yeg_gara_numero_licencia);
CREATE INDEX idx_yego_garantizado_activo ON yego_garantizado(yeg_gara_activo);

-- Crear trigger para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_yego_garantizado_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.yeg_gara_fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_yego_garantizado_updated_at
    BEFORE UPDATE ON yego_garantizado
    FOR EACH ROW
    EXECUTE FUNCTION update_yego_garantizado_updated_at();

-- Comentarios en la tabla y columnas
COMMENT ON TABLE yego_garantizado IS 'Tabla para el módulo de garantizado - gestión de conductores con garantía de ingresos';
COMMENT ON COLUMN yego_garantizado.yeg_gara_id IS 'Identificador único del registro';
COMMENT ON COLUMN yego_garantizado.yeg_gara_nombre_completo IS 'Nombre completo del conductor';
COMMENT ON COLUMN yego_garantizado.yeg_gara_numero_licencia IS 'Número de licencia del conductor (único)';
COMMENT ON COLUMN yego_garantizado.yeg_gara_telefono IS 'Número de teléfono del conductor';
COMMENT ON COLUMN yego_garantizado.yeg_gara_viajes IS 'Número total de viajes realizados';
COMMENT ON COLUMN yego_garantizado.yeg_gara_efectivo IS 'Monto en efectivo (W2)';
COMMENT ON COLUMN yego_garantizado.yeg_gara_pago_sin_efectivo IS 'Monto sin efectivo (X2)';
COMMENT ON COLUMN yego_garantizado.yeg_gara_com_yango IS 'Comisión Yango (Y2)';
COMMENT ON COLUMN yego_garantizado.yeg_gara_com_yego IS 'Comisión Yego (Z2)';
COMMENT ON COLUMN yego_garantizado.yeg_gara_bo_sem_ant IS 'Bono semana anterior (AA2) - se resta';
COMMENT ON COLUMN yego_garantizado.yeg_gara_bo_sem_act IS 'Bono semana actual (AB2)';
COMMENT ON COLUMN yego_garantizado.yeg_gara_total IS 'Total calculado: W2+X2+Y2+Z2-AA2+AB2';
COMMENT ON COLUMN yego_garantizado.yeg_gara_garantizado IS 'Monto garantizado según rango de bo_sem_act';
COMMENT ON COLUMN yego_garantizado.yeg_gara_diferencia IS 'Diferencia entre garantizado y total';
COMMENT ON COLUMN yego_garantizado.yeg_gara_semana IS 'Número de semana del período de garantía';
COMMENT ON COLUMN yego_garantizado.yeg_gara_viajes_actuales IS 'Viajes de la semana actual';
COMMENT ON COLUMN yego_garantizado.yeg_gara_flota IS 'Tipo de flota: YEGO BLACK, YEGO, YEGO PLUS';
COMMENT ON COLUMN yego_garantizado.yeg_gara_flota_id IS 'ID de la flota (referencia a tabla flotas)';
COMMENT ON COLUMN yego_garantizado.yeg_gara_fecha_creacion IS 'Fecha de creación del registro';
COMMENT ON COLUMN yego_garantizado.yeg_gara_fecha_actualizacion IS 'Fecha de última actualización';
COMMENT ON COLUMN yego_garantizado.yeg_gara_activo IS 'Indica si el registro está activo';

-- Insertar algunos datos de ejemplo
INSERT INTO yego_garantizado (
    yeg_gara_nombre_completo, 
    yeg_gara_numero_licencia, 
    yeg_gara_telefono, 
    yeg_gara_viajes, 
    yeg_gara_efectivo, 
    yeg_gara_pago_sin_efectivo, 
    yeg_gara_com_yango, 
    yeg_gara_com_yego, 
    yeg_gara_bo_sem_ant, 
    yeg_gara_bo_sem_act, 
    yeg_gara_total, 
    yeg_gara_garantizado, 
    yeg_gara_diferencia, 
    yeg_gara_semana, 
    yeg_gara_viajes_actuales, 
    yeg_gara_flota, 
    yeg_gara_flota_id
) VALUES 
(
    'Jorge Darwin Fuertes Buendia',
    'Q43845121',
    '968538129',
    111,
    871.10,
    557.54,
    -147.16,
    -26.82,
    520,
    0,
    1334.66,
    285,
    -1049.66,
    'Semana 35',
    111,
    'YEGO BLACK',
    1
),
(
    'Efrain Jesús Guzmán Silva',
    'Q006120225',
    '927174104',
    104,
    83.00,
    1076.70,
    -388.96,
    -137.22,
    -33.49,
    285,
    904.03,
    285,
    -619.03,
    'Semana 35',
    104,
    'YEGO',
    2
),
(
    'Fernando Neville Del Portal Gonzales',
    'Q07185617',
    '982770175',
    141,
    80.00,
    945.50,
    -425.81,
    -128.09,
    -32.02,
    285,
    639.58,
    285,
    -354.58,
    'Semana 35',
    141,
    'YEGO BLACK',
    1
);

-- Crear vista para consultas más fáciles
CREATE VIEW vista_yego_garantizado AS
SELECT 
    yeg_gara_id,
    yeg_gara_nombre_completo,
    yeg_gara_numero_licencia,
    yeg_gara_telefono,
    yeg_gara_viajes,
    yeg_gara_efectivo,
    yeg_gara_pago_sin_efectivo,
    yeg_gara_com_yango,
    yeg_gara_com_yego,
    yeg_gara_bo_sem_ant,
    yeg_gara_bo_sem_act,
    yeg_gara_total,
    yeg_gara_garantizado,
    yeg_gara_diferencia,
    yeg_gara_semana,
    yeg_gara_viajes_actuales,
    yeg_gara_flota,
    yeg_gara_flota_id,
    CASE 
        WHEN yeg_gara_diferencia > 0 THEN 'GARANTIZADO'
        ELSE 'NO GARANTIZADO'
    END as estado_garantia,
    yeg_gara_fecha_creacion,
    yeg_gara_fecha_actualizacion
FROM yego_garantizado
WHERE yeg_gara_activo = TRUE;

-- Función para calcular el total automáticamente
CREATE OR REPLACE FUNCTION calcular_total_yego_garantizado()
RETURNS TRIGGER AS $$
BEGIN
    NEW.yeg_gara_total = NEW.yeg_gara_efectivo + NEW.yeg_gara_pago_sin_efectivo + NEW.yeg_gara_com_yango + NEW.yeg_gara_com_yego - NEW.yeg_gara_bo_sem_ant + NEW.yeg_gara_bo_sem_act;
    NEW.yeg_gara_diferencia = NEW.yeg_gara_garantizado - NEW.yeg_gara_total;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para calcular total y diferencia automáticamente
CREATE TRIGGER trigger_calcular_total_yego_garantizado
    BEFORE INSERT OR UPDATE ON yego_garantizado
    FOR EACH ROW
    EXECUTE FUNCTION calcular_total_yego_garantizado();
