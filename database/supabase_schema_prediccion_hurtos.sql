-- ============================================================
-- ESQUEMA SUPABASE — SISTEMA DE PREDICCIÓN DE HURTOS (SEPH)
-- Nivel Básico | Dataset: Policía Nacional Colombia
-- Versión: 1.0 | Fecha: 2026-06-19
-- ============================================================

-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TABLA: ubicaciones
--    Catálogo normalizado de departamentos y municipios.
--    Fuente: CÓDIGO DANE del dataset de la Policía Nacional.
-- ============================================================
CREATE TABLE IF NOT EXISTS ubicaciones (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_dane   BIGINT      NOT NULL UNIQUE,
    departamento  VARCHAR(80) NOT NULL,
    municipio     VARCHAR(120) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ubicaciones IS 'Catálogo geográfico normalizado. Fuente: CÓDIGO DANE — Policía Nacional.';
COMMENT ON COLUMN ubicaciones.codigo_dane IS 'Código DANE oficial del municipio (ej. 11001000 = Bogotá D.C.).';

CREATE INDEX idx_ubicaciones_departamento ON ubicaciones (departamento);
CREATE INDEX idx_ubicaciones_codigo_dane  ON ubicaciones (codigo_dane);

-- ============================================================
-- 2. TABLA: tipos_hurto
--    Catálogo de modalidades delictivas según artículo del
--    Código Penal colombiano.
-- ============================================================
CREATE TABLE IF NOT EXISTS tipos_hurto (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo      VARCHAR(10) NOT NULL UNIQUE,   -- Ej. 'ART239-COM'
    descripcion TEXT        NOT NULL,           -- Ej. 'Artículo 239. Hurto entidades comerciales'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tipos_hurto IS 'Catálogo de tipos de hurto según el Código Penal colombiano.';

INSERT INTO tipos_hurto (codigo, descripcion) VALUES
    ('ART239-COM', 'ARTÍCULO 239. HURTO ENTIDADES COMERCIALES'),
    ('ART239-RES', 'ARTÍCULO 239. HURTO RESIDENCIAS')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 3. TABLA: armas_medios
--    Catálogo de armas o medios empleados en el hurto.
-- ============================================================
CREATE TABLE IF NOT EXISTS armas_medios (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(60) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE armas_medios IS 'Catálogo de armas o medios utilizados durante el hurto.';

INSERT INTO armas_medios (nombre) VALUES
    ('SIN EMPLEO DE ARMAS'),
    ('ARMA DE FUEGO'),
    ('CONTUNDENTES'),
    ('PALANCAS'),
    ('ARMA BLANCA / CORTOPUNZANTE'),
    ('LLAVE MAESTRA'),
    ('NO REPORTADO'),
    ('CORTANTES'),
    ('ESCOPOLAMINA'),
    ('PUNZANTES'),
    ('JERINGA')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 4. TABLA: registros_hurto  ← TABLA PRINCIPAL
--    Cada fila representa un evento de hurto reportado por la
--    Policía Nacional. Normalizada con FK a catálogos.
--    Variables del modelo (6 de 9 columnas del CSV):
--      • ubicacion_id   → DEPARTAMENTO + MUNICIPIO + CÓDIGO DANE
--      • tipo_hurto_id  → TIPO DE HURTO
--      • arma_medio_id  → ARMAS MEDIOS
--      • fecha_hecho    → FECHA HECHO
--      • grupo_etario   → GRUPO ETARIO
--      • cantidad       → CANTIDAD
-- ============================================================
CREATE TABLE IF NOT EXISTS registros_hurto (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ubicacion_id    UUID        NOT NULL REFERENCES ubicaciones(id)   ON DELETE RESTRICT,
    tipo_hurto_id   UUID        NOT NULL REFERENCES tipos_hurto(id)   ON DELETE RESTRICT,
    arma_medio_id   UUID        REFERENCES armas_medios(id)           ON DELETE SET NULL,
    fecha_hecho     DATE        NOT NULL,
    grupo_etario    VARCHAR(20) CHECK (grupo_etario IN ('ADULTOS', 'ADOLESCENTES', 'MENORES', 'NO REPORTA')),
    cantidad        SMALLINT    NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraint: evita duplicados exactos en la ingesta
    CONSTRAINT uq_registro UNIQUE (ubicacion_id, tipo_hurto_id, arma_medio_id, fecha_hecho, grupo_etario, cantidad)
);

COMMENT ON TABLE registros_hurto IS
    'Tabla principal de eventos de hurto. Fuente: Reporte_Hurto_por_Modalidades_Policía_Nacional_20260619.csv (633.804 registros).';
COMMENT ON COLUMN registros_hurto.grupo_etario IS 'Grupo etario de la víctima: ADULTOS, ADOLESCENTES, MENORES o NO REPORTA.';
COMMENT ON COLUMN registros_hurto.cantidad     IS 'Número de eventos de hurto del mismo tipo en la misma fecha y municipio.';

CREATE INDEX idx_hurto_ubicacion   ON registros_hurto (ubicacion_id);
CREATE INDEX idx_hurto_tipo        ON registros_hurto (tipo_hurto_id);
CREATE INDEX idx_hurto_arma        ON registros_hurto (arma_medio_id);
CREATE INDEX idx_hurto_fecha       ON registros_hurto (fecha_hecho);
CREATE INDEX idx_hurto_fecha_ubic  ON registros_hurto (fecha_hecho, ubicacion_id);

-- ============================================================
-- 5. TABLA: predicciones
--    Almacena los resultados del modelo básico de ML
--    (árbol de decisión / regresión) por municipio y mes.
-- ============================================================
CREATE TABLE IF NOT EXISTS predicciones (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ubicacion_id        UUID        NOT NULL REFERENCES ubicaciones(id) ON DELETE CASCADE,
    tipo_hurto_id       UUID        NOT NULL REFERENCES tipos_hurto(id) ON DELETE CASCADE,
    periodo_prediccion  DATE        NOT NULL,   -- Primer día del mes predicho
    cantidad_predicha   NUMERIC(10,2) NOT NULL CHECK (cantidad_predicha >= 0),
    nivel_riesgo        VARCHAR(10) NOT NULL CHECK (nivel_riesgo IN ('BAJO', 'MEDIO', 'ALTO', 'CRITICO')),
    confianza_pct       NUMERIC(5,2) CHECK (confianza_pct BETWEEN 0 AND 100),
    modelo_version      VARCHAR(30) NOT NULL DEFAULT '1.0.0',
    generado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_prediccion UNIQUE (ubicacion_id, tipo_hurto_id, periodo_prediccion, modelo_version)
);

COMMENT ON TABLE predicciones IS
    'Resultados del modelo predictivo básico (árbol de decisión). Una fila por municipio, tipo de hurto y período mensual.';
COMMENT ON COLUMN predicciones.nivel_riesgo      IS 'Clasificación de riesgo derivada del cuantil de la distribución histórica.';
COMMENT ON COLUMN predicciones.confianza_pct     IS 'Porcentaje de confianza del modelo para esta predicción (0-100).';
COMMENT ON COLUMN predicciones.modelo_version    IS 'Versión del modelo que generó la predicción (semver).';

CREATE INDEX idx_pred_ubicacion ON predicciones (ubicacion_id);
CREATE INDEX idx_pred_periodo   ON predicciones (periodo_prediccion);
CREATE INDEX idx_pred_riesgo    ON predicciones (nivel_riesgo);

-- ============================================================
-- 6. TABLA: recomendaciones
--    Catálogo de medidas preventivas gestionado por el
--    Administrador. También sirve como base de conocimiento
--    del Asistente de IA (Groq).
-- ============================================================
CREATE TABLE IF NOT EXISTS recomendaciones (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo          VARCHAR(120) NOT NULL,
    descripcion     TEXT         NOT NULL,
    nivel_riesgo    VARCHAR(10) NOT NULL CHECK (nivel_riesgo IN ('BAJO', 'MEDIO', 'ALTO')),
    tipo_hurto_id   UUID        REFERENCES tipos_hurto(id) ON DELETE SET NULL,
    aplica_nacional BOOLEAN     NOT NULL DEFAULT TRUE,
    activa          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE recomendaciones IS
    'Catálogo de medidas preventivas. Actúa como base de conocimiento del chatbot Groq.';
COMMENT ON COLUMN recomendaciones.aplica_nacional IS 'TRUE = aplica a todo el país; FALSE = asociada a municipios específicos vía tabla recomendaciones_ubicaciones.';

CREATE INDEX idx_recom_tipo_hurto ON recomendaciones (tipo_hurto_id);
CREATE INDEX idx_recom_nivel      ON recomendaciones (nivel_riesgo);
CREATE INDEX idx_recom_activa     ON recomendaciones (activa);

-- Relación N:M — recomendación puede aplicar a múltiples municipios
CREATE TABLE IF NOT EXISTS recomendaciones_ubicaciones (
    recomendacion_id UUID NOT NULL REFERENCES recomendaciones(id) ON DELETE CASCADE,
    ubicacion_id     UUID NOT NULL REFERENCES ubicaciones(id)     ON DELETE CASCADE,
    PRIMARY KEY (recomendacion_id, ubicacion_id)
);

-- ============================================================
-- 7. TABLA: alertas
--    Reglas de umbral configuradas por el Analista y registro
--    de alertas disparadas automáticamente.
-- ============================================================
CREATE TABLE IF NOT EXISTS alertas (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ubicacion_id     UUID        NOT NULL REFERENCES ubicaciones(id) ON DELETE CASCADE,
    tipo_hurto_id    UUID        REFERENCES tipos_hurto(id)          ON DELETE SET NULL,
    umbral_cantidad  INTEGER     NOT NULL CHECK (umbral_cantidad > 0),
    periodo          VARCHAR(10) NOT NULL CHECK (periodo IN ('DIARIO', 'SEMANAL', 'MENSUAL')),
    activa           BOOLEAN     NOT NULL DEFAULT TRUE,
    disparada_en     TIMESTAMPTZ,          -- NULL = aún no disparada
    valor_detectado  INTEGER,              -- Cantidad que superó el umbral
    leida            BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by       UUID,                 -- FK a auth.users de Supabase
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alertas IS 'Reglas de umbral y registro de notificaciones automáticas de seguridad.';
COMMENT ON COLUMN alertas.disparada_en    IS 'Fecha/hora en que el sistema detectó que el umbral fue superado.';
COMMENT ON COLUMN alertas.valor_detectado IS 'Valor real que activó la alerta (comparado contra umbral_cantidad).';

CREATE INDEX idx_alertas_ubicacion ON alertas (ubicacion_id);
CREATE INDEX idx_alertas_activa    ON alertas (activa, leida);

-- ============================================================
-- 8. TABLA: ingestas_dataset
--    Auditoría de cada carga del CSV para trazabilidad.
-- ============================================================
CREATE TABLE IF NOT EXISTS ingestas_dataset (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_archivo      VARCHAR(200) NOT NULL,
    registros_totales   INTEGER     NOT NULL DEFAULT 0,
    registros_nuevos    INTEGER     NOT NULL DEFAULT 0,
    registros_omitidos  INTEGER     NOT NULL DEFAULT 0,
    estado              VARCHAR(10) NOT NULL CHECK (estado IN ('EXITO', 'FALLIDO', 'PARCIAL')),
    mensaje_error       TEXT,
    ejecutado_por       UUID,       -- FK a auth.users de Supabase
    iniciado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_en       TIMESTAMPTZ
);

COMMENT ON TABLE ingestas_dataset IS 'Log de auditoría de cada carga del dataset de la Policía Nacional.';

-- ============================================================
-- 9. VISTAS ANALÍTICAS (soporte Dashboard y modelo ML)
-- ============================================================

-- 9.1 Vista: hurtos por departamento y mes
CREATE OR REPLACE VIEW v_hurtos_por_depto_mes AS
SELECT
    u.departamento,
    DATE_TRUNC('month', rh.fecha_hecho)::DATE AS mes,
    th.codigo                                  AS tipo_hurto_codigo,
    SUM(rh.cantidad)                           AS total_hurtos
FROM registros_hurto rh
JOIN ubicaciones  u  ON u.id  = rh.ubicacion_id
JOIN tipos_hurto  th ON th.id = rh.tipo_hurto_id
GROUP BY u.departamento, mes, th.codigo;

COMMENT ON VIEW v_hurtos_por_depto_mes IS 'Agrega hurtos por departamento, mes y tipo. Alimenta la gráfica de tendencia del Dashboard.';

-- 9.2 Vista: ranking de municipios por total de hurtos
CREATE OR REPLACE VIEW v_ranking_municipios AS
SELECT
    u.departamento,
    u.municipio,
    u.codigo_dane,
    th.codigo                     AS tipo_hurto_codigo,
    SUM(rh.cantidad)              AS total_hurtos,
    COUNT(DISTINCT rh.fecha_hecho) AS dias_con_evento
FROM registros_hurto rh
JOIN ubicaciones u  ON u.id  = rh.ubicacion_id
JOIN tipos_hurto th ON th.id = rh.tipo_hurto_id
GROUP BY u.departamento, u.municipio, u.codigo_dane, th.codigo
ORDER BY total_hurtos DESC;

COMMENT ON VIEW v_ranking_municipios IS 'Ranking de municipios por volumen de hurtos. Alimenta el mapa de calor y los KPIs del Dashboard.';

-- 9.3 Vista: distribución por arma/medio
CREATE OR REPLACE VIEW v_distribucion_armas AS
SELECT
    am.nombre        AS arma_medio,
    th.codigo        AS tipo_hurto_codigo,
    SUM(rh.cantidad) AS total_hurtos
FROM registros_hurto rh
JOIN armas_medios am ON am.id = rh.arma_medio_id
JOIN tipos_hurto  th ON th.id = rh.tipo_hurto_id
GROUP BY am.nombre, th.codigo
ORDER BY total_hurtos DESC;

COMMENT ON VIEW v_distribucion_armas IS 'Distribución de hurtos por arma o medio empleado. Insumo del modelo ML y recomendaciones.';

-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS) — POLÍTICAS BÁSICAS
-- ============================================================

ALTER TABLE registros_hurto  ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recomendaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestas_dataset  ENABLE ROW LEVEL SECURITY;

-- Lectura pública de registros y predicciones (ciudadano sin sesión)
CREATE POLICY "lectura_publica_registros"
    ON registros_hurto FOR SELECT USING (TRUE);

CREATE POLICY "lectura_publica_predicciones"
    ON predicciones FOR SELECT USING (TRUE);

CREATE POLICY "lectura_publica_recomendaciones"
    ON recomendaciones FOR SELECT USING (activa = TRUE);

-- Solo usuarios autenticados pueden gestionar alertas propias
CREATE POLICY "alertas_propias"
    ON alertas FOR ALL
    USING (created_by = auth.uid());

-- Solo usuarios autenticados con rol admin pueden insertar/editar (implementar vía claims)
CREATE POLICY "admin_escribe_recomendaciones"
    ON recomendaciones FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_escribe_ingestas"
    ON ingestas_dataset FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- FIN DEL ESQUEMA
-- ============================================================
