"""
=============================================================
SEPH Colombia — Cargador ETL del Dataset de Hurtos (Big Data)
=============================================================
Descripción : Versión optimizada y calibrada para el esquema
              exacto del CSV de la Policía Nacional (2010-2026).
=============================================================
"""

import os
import sys
import argparse
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# Configuración del Logger institucional
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("seph_etl")

load_dotenv()

def get_conexion():
    """Establece conexión directa con la base de datos de Supabase."""
    return psycopg2.connect(
        host=os.getenv("SUPABASE_HOST"),
        port=int(os.getenv("SUPABASE_PORT", 5432)),
        dbname=os.getenv("SUPABASE_DB", "postgres"),
        user=os.getenv("SUPABASE_USER"),
        password=os.getenv("SUPABASE_PASSWORD"),
        sslmode="require"
    )

def limpiar_y_cargar_dataframe(ruta_csv):
    """
    Lee e inspecciona el archivo plano CSV adaptándose a la estructura
    exacta provista por el dataset de la Policía Nacional de Colombia.
    """
    log.info("⏳ Leyendo archivo de Big Data de la Policía Nacional...")
    
    # Probar codificaciones comunes para curar tildes de departamentos (ATLÁNTICO, etc.)
    try:
        df = pd.read_csv(ruta_csv, encoding='utf-8', low_memory=False)
    except UnicodeDecodeError:
        df = pd.read_csv(ruta_csv, encoding='latin-1', low_memory=False)

    # Forzar que los nombres de las columnas no contengan espacios ocultos en los extremos
    df.columns = df.columns.str.strip()
    log.info(f"📋 Columnas oficiales listas para procesar: {list(df.columns)}")

    # Validaciones preventivas de existencia
    columnas_obligatorias = ['CODIGO DANE', 'FECHA HECHO', 'TIPO DE HURTO', 'CANTIDAD']
    for col in columnas_obligatorias:
        if col not in df.columns:
            log.error(f"❌ Falta la columna requerida: '{col}'. Columnas del archivo: {list(df.columns)}")
            raise KeyError(f"Estructura no compatible. Asegúrate de mapear '{col}'")

    # Limpieza del Código DANE para asegurar que sea entero
    df['CODIGO DANE'] = pd.to_numeric(df['CODIGO DANE'], errors='coerce').fillna(0).astype(int)
    
    # Filtrar registros sin código geográfico válido
    total_inicial = len(df)
    df = df[df['CODIGO DANE'] > 0]
    log.info(f"✅ Normalización inicial exitosa. {len(df):,} de {total_inicial:} filas listas para el clúster.")
    return df

def registrar_ingesta(cur, nombre_archivo, total, nuevos, omitidos, estado, iniciado_en, mensaje_error=None):
    """Registra la traza de auditoría en la tabla ingestas_dataset."""
    cur.execute(
        """
        INSERT INTO public.ingestas_dataset 
        (id, nombre_archivo, registros_totales, registros_nuevos, registros_omitidos, estado, iniciado_en, mensaje_error)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (str(uuid.uuid4()), nombre_archivo, total, nuevos, omitidos, estado, iniciado_en, mensaje_error)
    )

def main():
    parser = argparse.ArgumentParser(description="Pipeline ETL - SEPH Colombia")
    parser.add_argument("--csv", type=str, default="Reporte_Hurto_por_Modalidades_Policía_Nacional_20260711.csv", help="Ruta del CSV")
    parser.add_argument("--batch-size", type=int, default=5000, help="Tamaño de lote")
    args = parser.parse_args()

    ruta_csv = Path(args.csv)
    if not ruta_csv.exists():
        log.error(f"❌ No se encontró el archivo en la ruta especificada: {ruta_csv.absolute()}")
        sys.exit(1)

    iniciado_en = datetime.now(timezone.utc)
    conn = None
    
    try:
        df = limpiar_y_cargar_dataframe(ruta_csv)
        
        log.info("🔌 Abriendo túnel de datos con Supabase...")
        conn = get_conexion()
        conn.autocommit = False
        
        insertados = 0
        omitidos_total = 0
        
        with conn.cursor() as cur:
            log.info("🗺️ Sincronizando catálogo de ubicaciones únicas...")
            ubicaciones_unicas = df[['CODIGO DANE', 'MUNICIPIO', 'DEPARTAMENTO']].drop_duplicates()
            
            for _, row in ubicaciones_unicas.iterrows():
                # Quitar el " (CT)" que la policía mete en los nombres de municipios core
                nom_mun = str(row['MUNICIPIO']).replace(' (CT)', '').strip().upper()
                nom_dep = str(row['DEPARTAMENTO']).strip().upper()
                
                cur.execute(
                    """
                    INSERT INTO public.ubicaciones (codigo_dane, departamento, municipio)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (codigo_dane) DO UPDATE 
                    SET departamento = EXCLUDED.departamento, municipio = EXCLUDED.municipio
                    """,
                    (int(row['CODIGO DANE']), nom_dep, nom_mun)
                )
            
            # Mapear diccionarios en memoria para acelerar la relación de llaves foráneas en Big Data
            cur.execute("SELECT id, codigo_dane FROM public.ubicaciones")
            dict_ubicaciones = {cd: uid for uid, cd in cur.fetchall()}
            
            cur.execute("SELECT id, codigo FROM public.tipos_hurto")
            dict_tipos = {cod.strip().upper(): tid for tid, cod in cur.fetchall()}
            
            cur.execute("SELECT id, nombre FROM public.armas_medios")
            dict_armas = {nom.strip().upper(): aid for aid, nom in cur.fetchall()}

            log.info("📊 Iniciando inyección masiva en 'registros_hurto'...")
            registros_batch = []
            
            for _, row in df.iterrows():
                dane = int(row['CODIGO DANE'])
                ubi_id = dict_ubicaciones.get(dane)
                
                # Mapeo inteligente del Tipo de Hurto basado en tu CSV real
                tipo_txt = str(row.get('TIPO DE HURTO', '')).upper()
                # Clasificación lógica institucional: Hurtos comerciales vs residenciales
                tipo_codigo = 'ART239-RES' if 'RESIDENCIA' in tipo_txt else 'ART239-COM'
                tipo_id = dict_tipos.get(tipo_codigo)
                
                # Gestión dinámica de armas o medios delictivos nuevos
                arma_txt = str(row.get('ARMAS MEDIOS', 'NO REPORTADO')).strip().upper()
                if arma_txt not in dict_armas and arma_txt != '':
                    cur.execute("INSERT INTO public.armas_medios (nombre) VALUES (%s) ON CONFLICT (nombre) DO NOTHING", (arma_txt,))
                    cur.execute("SELECT id FROM public.armas_medios WHERE nombre = %s", (arma_txt,))
                    res_arma = cur.fetchone()
                    if res_arma:
                        dict_armas[arma_txt] = res_arma[0]
                
                arma_id = dict_armas.get(arma_txt) or dict_armas.get('NO REPORTADO')

                # Tratamiento preciso de fechas DD/MM/YYYY
                fecha_str = str(row.get('FECHA HECHO', ''))[:10]
                try:
                    fecha_val = pd.to_datetime(fecha_str, dayfirst=True).date()
                except Exception:
                    fecha_val = datetime.now().date()

                cantidad = int(row.get('CANTIDAD', 1))

                if ubi_id and tipo_id:
                    registros_batch.append((
                        str(uuid.uuid4()), ubi_id, tipo_id, arma_id, fecha_val,
                        str(row.get('GRUPO ETARIO', 'ADULTOS')).strip().upper(),
                        str(row.get('GENERO', 'TODOS')).strip().upper(),
                        cantidad
                    ))
                    insertados += cantidad
                else:
                    omitidos_total += 1

                # Ejecutar inserción cuando alcancemos el tamaño del lote
                if len(registros_batch) >= args.batch_size:
                    psycopg2.extras.execute_batch(
                        cur,
                        """
                        INSERT INTO public.registros_hurto 
                        (id, ubicacion_id, tipo_hurto_id, arma_medio_id, fecha_hecho, grupo_etario, genero, cantidad)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        registros_batch
                    )
                    registros_batch = []
                    log.info(f"   → Consolidados en DB: {insertados:,} registros procesados.")

            # Insertar remanente
            if registros_batch:
                psycopg2.extras.execute_batch(
                    cur,
                    """
                    INSERT INTO public.registros_hurto 
                    (id, ubicacion_id, tipo_hurto_id, arma_medio_id, fecha_hecho, grupo_etario, genero, cantidad)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    registros_batch
                )

            registrar_ingesta(
                cur, nombre_archivo=ruta_csv.name, total=len(df),
                nuevos=insertados, omitidos=omitidos_total, estado="EXITO", iniciado_en=iniciado_en
            )

        conn.commit()
        log.info("=" * 60)
        log.info("🏆 ¡DATASET INYECTADO Y AUDITADO CON EXITO EN SUPABASE!")
        log.info(f"  Total procesado: {len(df):,}")
        log.info(f"  Filas insertadas: {insertados:,}")
        log.info("=" * 60)

    except Exception as exc:
        if conn:
            conn.rollback()
        mensaje_error = str(exc)
        log.error(f"❌ Error en la carga masiva: {mensaje_error}", exc_info=True)
        try:
            with get_conexion() as conn_err:
                with conn_err.cursor() as cur_err:
                    registrar_ingesta(
                        cur_err, nombre_archivo=ruta_csv.name, total=0,
                        nuevos=0, omitidos=0, estado="FALLIDO", iniciado_en=iniciado_en, mensaje_error=mensaje_error
                    )
                conn_err.commit()
        except Exception:
            pass
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()