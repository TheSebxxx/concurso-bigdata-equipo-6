import os, time
import psycopg2
from geopy.geocoders import Nominatim
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("SUPABASE_HOST"),
    port=int(os.getenv("SUPABASE_PORT", 5432)),
    dbname=os.getenv("SUPABASE_DB"),
    user=os.getenv("SUPABASE_USER"),
    password=os.getenv("SUPABASE_PASSWORD"),
    sslmode="require"
)
conn.autocommit = False
cur = conn.cursor()

# Traer municipios sin coordenadas
cur.execute("""
    SELECT id, municipio, departamento
    FROM ubicaciones
    WHERE lat IS NULL OR lng IS NULL
    ORDER BY municipio
""")
municipios = cur.fetchall()
print(f"Municipios a geocodificar: {len(municipios)}")

geo = Nominatim(user_agent="seph_colombia")
actualizados = 0
fallidos     = 0

for uid, municipio, departamento in municipios:
    try:
        query = f"{municipio}, {departamento}, Colombia"
        loc   = geo.geocode(query, timeout=10)

        if loc:
            cur.execute(
                "UPDATE ubicaciones SET lat=%s, lng=%s WHERE id=%s",
                (round(loc.latitude, 6), round(loc.longitude, 6), uid)
            )
            actualizados += 1
            print(f"  ✓ {municipio}, {departamento} → {loc.latitude:.4f}, {loc.longitude:.4f}")
        else:
            fallidos += 1
            print(f"  ✗ No encontrado: {municipio}, {departamento}")

        time.sleep(1.1)  # Respetar límite de Nominatim (1 req/seg)

        # Commit cada 50 registros
        if actualizados % 50 == 0 and actualizados > 0:
            conn.commit()
            print(f"  → Commit parcial: {actualizados} actualizados")

    except Exception as e:
        print(f"  ! Error en {municipio}: {e}")
        fallidos += 1
        time.sleep(2)

conn.commit()
print(f"\nFinalizado: {actualizados} actualizados | {fallidos} fallidos")
cur.close()
conn.close()