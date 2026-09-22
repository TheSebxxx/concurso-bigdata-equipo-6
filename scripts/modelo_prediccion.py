"""
=============================================================
SEPH Colombia — Modelo Predictivo Básico
=============================================================
Algoritmo : Árbol de Decisión (DecisionTreeRegressor)
Variables : mes_num, año, departamento_encoded,
            tipo_hurto_encoded, promedio_historico_municipio
Target    : cantidad de hurtos del mes siguiente
Salida    : tabla 'predicciones' en Supabase
=============================================================
"""

import os
import uuid
import warnings
import psycopg2
import psycopg2.extras
import numpy  as np
import pandas as pd
from datetime        import date, timedelta
from dateutil.relativedelta import relativedelta
from dotenv          import load_dotenv
from sklearn.tree    import DecisionTreeRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings('ignore')
load_dotenv()

# ── Conexión ──────────────────────────────────────────────────
def get_conn():
    return psycopg2.connect(
        host    =os.getenv("SUPABASE_HOST"),
        port    =int(os.getenv("SUPABASE_PORT", 5432)),
        dbname  =os.getenv("SUPABASE_DB", "postgres"),
        user    =os.getenv("SUPABASE_USER"),
        password=os.getenv("SUPABASE_PASSWORD"),
        sslmode ="require"
    )

# ── 1. Extraer datos históricos ───────────────────────────────
def extraer_datos(conn):
    print("📥 Extrayendo datos históricos de Supabase...")
    query = """
        SELECT
            u.municipio,
            u.departamento,
            u.id             AS ubicacion_id,
            th.id            AS tipo_hurto_id,
            th.codigo        AS tipo_hurto_codigo,
            DATE_TRUNC('month', rh.fecha_hecho)::DATE AS mes,
            SUM(rh.cantidad) AS total_hurtos
        FROM registros_hurto rh
        JOIN ubicaciones  u  ON u.id  = rh.ubicacion_id
        JOIN tipos_hurto  th ON th.id = rh.tipo_hurto_id
        GROUP BY u.municipio, u.departamento, u.id, th.id, th.codigo,
                 DATE_TRUNC('month', rh.fecha_hecho)
        ORDER BY mes, u.municipio
    """
    df = pd.read_sql(query, conn)
    print(f"   → {len(df):,} filas | {df['municipio'].nunique()} municipios | {df['mes'].min()} → {df['mes'].max()}")
    return df

# ── 2. Feature engineering ────────────────────────────────────
def preparar_features(df):
    print("⚙️  Preparando features...")
    df = df.copy()
    df['mes']          = pd.to_datetime(df['mes'])
    df['mes_num']      = df['mes'].dt.month
    df['año']          = df['mes'].dt.year
    df['trimestre']    = df['mes'].dt.quarter
    df['total_hurtos'] = df['total_hurtos'].astype(float)

    # Promedio histórico por municipio+tipo (feature clave)
    promedio = df.groupby(['ubicacion_id','tipo_hurto_id'])['total_hurtos'].mean().reset_index()
    promedio.columns = ['ubicacion_id','tipo_hurto_id','promedio_historico']
    df = df.merge(promedio, on=['ubicacion_id','tipo_hurto_id'], how='left')

    # Lag: valor del mes anterior
    df = df.sort_values(['ubicacion_id','tipo_hurto_id','mes'])
    df['lag_1'] = df.groupby(['ubicacion_id','tipo_hurto_id'])['total_hurtos'].shift(1)
    df['lag_3'] = df.groupby(['ubicacion_id','tipo_hurto_id'])['total_hurtos'].shift(3)

    # Encoding
    le_depto = LabelEncoder()
    le_tipo  = LabelEncoder()
    df['depto_enc'] = le_depto.fit_transform(df['departamento'])
    df['tipo_enc']  = le_tipo.fit_transform(df['tipo_hurto_codigo'])

    df = df.dropna(subset=['lag_1','lag_3'])
    return df, le_depto, le_tipo

# ── 3. Entrenar modelo ────────────────────────────────────────
def entrenar_modelo(df):
    print("🤖 Entrenando árbol de decisión...")

    features = ['mes_num','año','trimestre','depto_enc','tipo_enc','promedio_historico','lag_1','lag_3']
    X = df[features]
    y = df['total_hurtos']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    modelo = DecisionTreeRegressor(
        max_depth        = 8,
        min_samples_leaf = 10,
        random_state     = 42
    )
    modelo.fit(X_train, y_train)

    y_pred = modelo.predict(X_test)
    mae    = mean_absolute_error(y_test, y_pred)
    r2     = r2_score(y_test, y_pred)

    print(f"   → MAE : {mae:.2f}  (error promedio en hurtos/mes)")
    print(f"   → R²  : {r2:.4f}  (capacidad explicativa del modelo)")

    return modelo, features

# ── 4. Generar predicciones ───────────────────────────────────
def generar_predicciones(df, modelo, features):
    print("🔮 Generando predicciones para los próximos 3 meses...")

    hoy         = date.today().replace(day=1)
    meses_futuros = [hoy + relativedelta(months=i) for i in range(1, 4)]

    # Último registro por municipio+tipo para tomar lags
    ultimo = df.sort_values('mes').groupby(['ubicacion_id','tipo_hurto_id']).last().reset_index()

    predicciones = []
    for mes_pred in meses_futuros:
        filas = ultimo.copy()
        filas['mes_num']   = mes_pred.month
        filas['año']       = mes_pred.year
        filas['trimestre'] = (mes_pred.month - 1) // 3 + 1

        X_pred = filas[features]
        filas['prediccion'] = np.maximum(0, modelo.predict(X_pred)).round(0)

        for _, row in filas.iterrows():
            total = int(row['prediccion'])

            # Nivel de riesgo basado en cuantiles históricos del municipio
            p75 = df[df['ubicacion_id'] == row['ubicacion_id']]['total_hurtos'].quantile(0.75)
            p50 = df[df['ubicacion_id'] == row['ubicacion_id']]['total_hurtos'].quantile(0.50)
            p25 = df[df['ubicacion_id'] == row['ubicacion_id']]['total_hurtos'].quantile(0.25)

            if   total >= p75: nivel = 'CRITICO' if total >= p75 * 1.5 else 'ALTO'
            elif total >= p50: nivel = 'MEDIO'
            elif total >= p25: nivel = 'BAJO'
            else:              nivel = 'BAJO'

            predicciones.append({
                'id':                str(uuid.uuid4()),
                'ubicacion_id':      str(row['ubicacion_id']),
                'tipo_hurto_id':     str(row['tipo_hurto_id']),
                'periodo_prediccion': mes_pred.strftime('%Y-%m-01'),
                'cantidad_predicha':  total,
                'nivel_riesgo':       nivel,
                'confianza_pct':      round(min(95, max(50, (1 - abs(total - row['promedio_historico']) / max(row['promedio_historico'], 1)) * 100)), 2),
                'modelo_version':    '1.0.0',
            })

    print(f"   → {len(predicciones):,} predicciones generadas ({len(meses_futuros)} meses × municipios × tipos)")
    return predicciones

# ── 5. Guardar en Supabase ────────────────────────────────────
def guardar_predicciones(conn, predicciones):
    print("💾 Guardando predicciones en Supabase...")
    cur = conn.cursor()

    # Limpiar predicciones anteriores del mismo modelo
    cur.execute("DELETE FROM predicciones WHERE modelo_version = '1.0.0'")
    print(f"   → Predicciones anteriores eliminadas")

    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO predicciones
            (id, ubicacion_id, tipo_hurto_id, periodo_prediccion,
             cantidad_predicha, nivel_riesgo, confianza_pct, modelo_version)
        VALUES %s
        ON CONFLICT ON CONSTRAINT uq_prediccion DO UPDATE SET
            cantidad_predicha = EXCLUDED.cantidad_predicha,
            nivel_riesgo      = EXCLUDED.nivel_riesgo,
            confianza_pct     = EXCLUDED.confianza_pct,
            generado_en       = NOW()
        """,
        [(
            p['id'], p['ubicacion_id'], p['tipo_hurto_id'],
            p['periodo_prediccion'], p['cantidad_predicha'],
            p['nivel_riesgo'], p['confianza_pct'], p['modelo_version']
        ) for p in predicciones],
        page_size=1000
    )

    conn.commit()
    cur.close()
    print(f"   → {len(predicciones):,} predicciones guardadas ✓")

# ── Main ──────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 60)
    print("SEPH — Modelo Predictivo v1.0.0")
    print("Algoritmo: Árbol de Decisión (scikit-learn)")
    print("=" * 60)

    conn = get_conn()
    try:
        df                       = extraer_datos(conn)
        df_feat, le_depto, le_t  = preparar_features(df)
        modelo, features         = entrenar_modelo(df_feat)
        predicciones             = generar_predicciones(df_feat, modelo, features)
        guardar_predicciones(conn, predicciones)
        print("=" * 60)
        print("✓ PROCESO COMPLETADO EXITOSAMENTE")
        print("=" * 60)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback; traceback.print_exc()
    finally:
        conn.close()