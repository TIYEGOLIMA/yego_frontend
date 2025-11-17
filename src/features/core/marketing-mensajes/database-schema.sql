-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA MARKETING MENSAJES
-- ============================================

-- Tabla principal de mensajes de marketing
CREATE TABLE marketing_mensajes (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    modo VARCHAR(50) DEFAULT 'Otros', -- Otros, Promoción, Recordatorio
    tipo VARCHAR(50) DEFAULT 'Sin tipo', -- Sin tipo, Notificación, Anuncio
    archivo_url VARCHAR(500), -- URL del archivo adjunto si existe
    whatsapp BOOLEAN DEFAULT false,
    yandex BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, -- ID del usuario que creó el mensaje
    updated_by INTEGER -- ID del usuario que actualizó el mensaje
);

-- Tabla de días activos para cada mensaje (relación muchos a muchos)
CREATE TABLE marketing_mensajes_dias (
    id SERIAL PRIMARY KEY,
    mensaje_id INTEGER NOT NULL REFERENCES marketing_mensajes(id) ON DELETE CASCADE,
    dia VARCHAR(10) NOT NULL, -- 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mensaje_id, dia)
);

-- Tabla de horarios de programación
CREATE TABLE marketing_mensajes_horarios (
    id SERIAL PRIMARY KEY,
    mensaje_id INTEGER NOT NULL REFERENCES marketing_mensajes(id) ON DELETE CASCADE,
    hora_inicio TIME, -- Hora de inicio (opcional)
    hora_fin TIME, -- Hora de fin (opcional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mensaje_id)
);

-- Tabla de grupos asignados a mensajes (relación muchos a muchos)
CREATE TABLE marketing_mensajes_grupos (
    id SERIAL PRIMARY KEY,
    mensaje_id INTEGER NOT NULL REFERENCES marketing_mensajes(id) ON DELETE CASCADE,
    grupo_id VARCHAR(100) NOT NULL, -- ID del grupo desde la API externa
    grupo_nombre VARCHAR(255), -- Nombre del grupo (cache)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mensaje_id, grupo_id)
);

-- Tabla de flotas asignadas a mensajes (relación muchos a muchos)
CREATE TABLE marketing_mensajes_flotas (
    id SERIAL PRIMARY KEY,
    mensaje_id INTEGER NOT NULL REFERENCES marketing_mensajes(id) ON DELETE CASCADE,
    flota_id VARCHAR(100) NOT NULL, -- ID de la flota desde la API externa
    flota_nombre VARCHAR(255), -- Nombre de la flota (cache)
    flota_ubicacion VARCHAR(255), -- Ubicación de la flota (cache)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mensaje_id, flota_id)
);

-- Tabla de histórico de programaciones (auditoría)
CREATE TABLE marketing_mensajes_historico (
    id SERIAL PRIMARY KEY,
    mensaje_id INTEGER NOT NULL REFERENCES marketing_mensajes(id) ON DELETE CASCADE,
    accion VARCHAR(50) NOT NULL, -- 'CREADO', 'ACTUALIZADO', 'ENVIADO', 'CANCELADO', 'ELIMINADO'
    estado_anterior JSONB, -- Estado anterior del mensaje (para actualizaciones)
    estado_nuevo JSONB, -- Estado nuevo del mensaje
    fecha_programada TIMESTAMP, -- Fecha/hora programada para el envío
    fecha_ejecucion TIMESTAMP, -- Fecha/hora real de ejecución
    canal VARCHAR(50), -- 'whatsapp', 'yandex', 'ambos'
    destinatarios_count INTEGER, -- Cantidad de destinatarios
    exitoso BOOLEAN, -- Si el envío fue exitoso
    error_message TEXT, -- Mensaje de error si falló
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER -- ID del usuario que realizó la acción
);

-- Tabla de envíos individuales (detalle de cada envío)
CREATE TABLE marketing_mensajes_envios (
    id SERIAL PRIMARY KEY,
    historico_id INTEGER NOT NULL REFERENCES marketing_mensajes_historico(id) ON DELETE CASCADE,
    mensaje_id INTEGER NOT NULL REFERENCES marketing_mensajes(id) ON DELETE CASCADE,
    destinatario_id VARCHAR(100) NOT NULL, -- ID del destinatario (conductor, grupo, etc.)
    destinatario_tipo VARCHAR(50) NOT NULL, -- 'conductor', 'grupo', 'flota'
    canal VARCHAR(50) NOT NULL, -- 'whatsapp', 'yandex'
    estado VARCHAR(50) NOT NULL, -- 'PENDIENTE', 'ENVIADO', 'ENTREGADO', 'FALLIDO', 'LEIDO'
    fecha_envio TIMESTAMP,
    fecha_entrega TIMESTAMP,
    fecha_lectura TIMESTAMP,
    error_message TEXT,
    metadata JSONB, -- Información adicional del envío
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_marketing_mensajes_activo ON marketing_mensajes(activo);
CREATE INDEX idx_marketing_mensajes_created_at ON marketing_mensajes(created_at);
CREATE INDEX idx_marketing_mensajes_dias_mensaje_id ON marketing_mensajes_dias(mensaje_id);
CREATE INDEX idx_marketing_mensajes_historico_mensaje_id ON marketing_mensajes_historico(mensaje_id);
CREATE INDEX idx_marketing_mensajes_historico_fecha_programada ON marketing_mensajes_historico(fecha_programada);
CREATE INDEX idx_marketing_mensajes_historico_accion ON marketing_mensajes_historico(accion);
CREATE INDEX idx_marketing_mensajes_envios_historico_id ON marketing_mensajes_envios(historico_id);
CREATE INDEX idx_marketing_mensajes_envios_estado ON marketing_mensajes_envios(estado);
CREATE INDEX idx_marketing_mensajes_envios_destinatario ON marketing_mensajes_envios(destinatario_id, destinatario_tipo);

-- Triggers para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketing_mensajes_updated_at 
    BEFORE UPDATE ON marketing_mensajes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vista para facilitar consultas de mensajes con sus relaciones
CREATE VIEW v_marketing_mensajes_completo AS
SELECT 
    m.id,
    m.titulo,
    m.mensaje,
    m.modo,
    m.tipo,
    m.archivo_url,
    m.whatsapp,
    m.yandex,
    m.activo,
    m.created_at,
    m.updated_at,
    ARRAY_AGG(DISTINCT md.dia) FILTER (WHERE md.dia IS NOT NULL) as dias_activos,
    h.hora_inicio,
    h.hora_fin,
    ARRAY_AGG(DISTINCT mg.grupo_id) FILTER (WHERE mg.grupo_id IS NOT NULL) as grupos_ids,
    ARRAY_AGG(DISTINCT mf.flota_id) FILTER (WHERE mf.flota_id IS NOT NULL) as flotas_ids
FROM marketing_mensajes m
LEFT JOIN marketing_mensajes_dias md ON m.id = md.mensaje_id
LEFT JOIN marketing_mensajes_horarios h ON m.id = h.mensaje_id
LEFT JOIN marketing_mensajes_grupos mg ON m.id = mg.mensaje_id
LEFT JOIN marketing_mensajes_flotas mf ON m.id = mf.mensaje_id
GROUP BY m.id, h.hora_inicio, h.hora_fin;

-- Comentarios en las tablas
COMMENT ON TABLE marketing_mensajes IS 'Tabla principal de mensajes de marketing';
COMMENT ON TABLE marketing_mensajes_dias IS 'Días de la semana en que el mensaje está activo';
COMMENT ON TABLE marketing_mensajes_horarios IS 'Horarios de programación de los mensajes';
COMMENT ON TABLE marketing_mensajes_grupos IS 'Grupos asignados a cada mensaje (referencia a API externa)';
COMMENT ON TABLE marketing_mensajes_flotas IS 'Flotas asignadas a cada mensaje (referencia a API externa)';
COMMENT ON TABLE marketing_mensajes_historico IS 'Histórico de todas las acciones realizadas sobre los mensajes';
COMMENT ON TABLE marketing_mensajes_envios IS 'Detalle de cada envío individual a destinatarios';

