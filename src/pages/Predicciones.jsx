import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet'
import { getPredicciones } from '../services/hurtosService'
import './Predicciones.css'

const NIVELES = ['TODOS', 'CRITICO', 'ALTO', 'MEDIO', 'BAJO']

const NIVEL_CONFIG = {
  CRITICO: { color: '#ef4444', badge: 'badge-alto',  label: 'CRÍTICO' },
  ALTO:    { color: '#f97316', badge: 'badge-alto',  label: 'ALTO'    },
  MEDIO:   { color: '#eab308', badge: 'badge-medio', label: 'MEDIO'   },
  BAJO:    { color: '#22c55e', badge: 'badge-bajo',  label: 'BAJO'    },
}

const RADIO_MAP = { CRITICO: 22, ALTO: 16, MEDIO: 10, BAJO: 6 }

const CHIP_CLASE = {
  TODOS:  'activo-todos',
  CRITICO:'activo-critico',
  ALTO:   'activo-alto',
  MEDIO:  'activo-medio',
  BAJO:   'activo-bajo',
}

function agruparPorMunicipio(datos) {
  const mapa = {}
  const orden = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO']
  datos.forEach(d => {
    const key = `${d.municipio}||${d.departamento}`
    if (!mapa[key] || orden.indexOf(d.nivel_riesgo) < orden.indexOf(mapa[key].nivel_riesgo)) {
      mapa[key] = { ...d }
    }
  })
  return Object.values(mapa)
}

export default function Predicciones() {
  const [datos,    setDatos]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [nivel,    setNivel]    = useState('TODOS')
  const [tipo,     setTipo]     = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [periodo,  setPeriodo]  = useState('TODOS')

  useEffect(() => {
    setLoading(true)
    setError(null)
    getPredicciones(tipo || null, nivel === 'TODOS' ? null : nivel)
      .then(setDatos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [nivel, tipo])

  const periodos = useMemo(() => {
    const unicos = [...new Set(datos.map(d => d.periodo_prediccion?.slice(0, 7)))].sort()
    return unicos
  }, [datos])

  const datosFiltrados = useMemo(() => {
    let f = datos
    if (periodo !== 'TODOS') f = f.filter(d => d.periodo_prediccion?.startsWith(periodo))
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      f = f.filter(d =>
        d.municipio?.toLowerCase().includes(q) ||
        d.departamento?.toLowerCase().includes(q)
      )
    }
    return f
  }, [datos, periodo, busqueda])

  const puntosMapas    = useMemo(() => agruparPorMunicipio(datosFiltrados), [datosFiltrados])
  const totalPredichos = datosFiltrados.reduce((a, d) => a + d.cantidad_predicha, 0)
  const confianzaProm  = datosFiltrados.length
    ? (datosFiltrados.reduce((a, d) => a + d.confianza_pct, 0) / datosFiltrados.length).toFixed(1)
    : 0
  const conteoNiveles  = datosFiltrados.reduce((acc, d) => {
    acc[d.nivel_riesgo] = (acc[d.nivel_riesgo] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* Encabezado */}
      <div className="pred-header">
        <div>
          <h1 className="pred-title">Predicciones ML — Próximos 3 Meses</h1>
          <p className="pred-subtitle">Modelo: Árbol de Decisión v1.0.0 · Datos 2010–2026</p>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: '16px' }}>❌ {error}</div>}

      {/* Disclaimer */}
      <div className="pred-disclaimer">
        ℹ️ Las predicciones son estimaciones estadísticas y <strong>no garantizan</strong> la
        ocurrencia de los eventos indicados. Úsalas como herramienta de apoyo a la decisión.
      </div>

      {/* Filtros */}
      <div className="pred-filtros">
        <div className="pred-filtro-grupo">
          <span className="pred-filtro-label">📅 Período</span>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}>
            <option value="TODOS">Todos los meses</option>
            {periodos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="pred-filtros-divider" />

        <div className="pred-filtro-grupo">
          <span className="pred-filtro-label">🏷️ Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="ART239-COM">Comerciales</option>
            <option value="ART239-RES">Residencias</option>
          </select>
        </div>

        <div className="pred-filtros-divider" />

        <div className="pred-niveles">
          {NIVELES.map(n => (
            <button
              key={n}
              onClick={() => setNivel(n)}
              className={`pred-nivel-chip ${nivel === n ? CHIP_CLASE[n] : ''}`}
            >
              {n}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Municipio o depto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ marginLeft: 'auto', minWidth: '180px' }}
        />
      </div>

      {/* KPIs */}
      {!loading && (
        <div className="pred-kpis">
          <div className="kpi-card">
            <div className="kpi-label">Hurtos proyectados</div>
            <div className="kpi-value">{totalPredichos.toLocaleString('es-CO')}</div>
            <div className="kpi-sub">próximos 3 meses</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Zonas críticas</div>
            <div className="kpi-value" style={{ color: '#ef4444' }}>
              {conteoNiveles['CRITICO'] ?? 0}
            </div>
            <div className="kpi-sub kpi-up">atención inmediata</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Zonas en riesgo alto</div>
            <div className="kpi-value" style={{ color: '#f97316' }}>
              {conteoNiveles['ALTO'] ?? 0}
            </div>
            <div className="kpi-sub kpi-up">monitoreo prioritario</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Confianza promedio</div>
            <div className="kpi-value" style={{ color: '#16a34a' }}>{confianzaProm}%</div>
            <div className="kpi-sub">modelo v1.0.0</div>
          </div>
        </div>
      )}

      {/* Mapa */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-header">
          <span className="card-title">🗺️ Mapa de zonas predichas</span>
          <div className="pred-leyenda">
            {Object.entries(NIVEL_CONFIG).map(([k, v]) => (
              <span key={k} className="pred-leyenda-item">
                <span className="pred-leyenda-dot" style={{ background: v.color }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        <div className="pred-mapa-container">
          {loading ? (
            <div className="loading" style={{ paddingTop: '180px' }}>
              ⏳ Cargando predicciones...
            </div>
          ) : (
            <MapContainer
              center={[4.5709, -74.2973]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <ZoomControl position="bottomright" />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
              />
              {puntosMapas.map((d, i) => {
                const cfg = NIVEL_CONFIG[d.nivel_riesgo] ?? NIVEL_CONFIG['BAJO']
                return (
                  <CircleMarker
                    key={i}
                    center={[Number(d.lat), Number(d.lng)]}
                    radius={RADIO_MAP[d.nivel_riesgo] ?? 6}
                    pathOptions={{
                      color:       cfg.color,
                      fillColor:   cfg.color,
                      fillOpacity: 0.7,
                      weight:      1.5,
                    }}
                  >
                    <Popup>
                      <div className="pred-popup">
                        <p className="pred-popup-titulo">🔮 {d.municipio}</p>
                        <p className="pred-popup-depto">{d.departamento}</p>
                        <p className="pred-popup-fila">
                          Período: <strong>{d.periodo_prediccion?.slice(0, 7)}</strong>
                        </p>
                        <p className="pred-popup-fila">
                          Hurtos predichos: <strong>{d.cantidad_predicha.toLocaleString('es-CO')}</strong>
                        </p>
                        <p className="pred-popup-fila">
                          Confianza: <strong className="pred-popup-confianza">{d.confianza_pct}%</strong>
                        </p>
                        <span
                          className={`badge ${cfg.badge}`}
                          style={{ marginTop: '8px', display: 'inline-block' }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📋 Detalle de predicciones</span>
          <span className="pred-tabla-count">{datosFiltrados.length} registros</span>
        </div>
        <div className="pred-tabla-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Municipio</th>
                <th>Departamento</th>
                <th>Tipo</th>
                <th>Período</th>
                <th>Hurtos predichos</th>
                <th>Confianza</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.slice(0, 100).map((d, i) => {
                const cfg = NIVEL_CONFIG[d.nivel_riesgo] ?? NIVEL_CONFIG['BAJO']
                return (
                  <tr key={i}>
                    <td style={{ color: '#8a9bbf', fontWeight: 500 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{d.municipio}</td>
                    <td style={{ color: '#5a6e8a' }}>{d.departamento}</td>
                    <td style={{ fontSize: '11px', color: '#5a6e8a' }}>
                      {d.tipo_hurto_codigo === 'ART239-COM' ? 'Comercial' : 'Residencia'}
                    </td>
                    <td>{d.periodo_prediccion?.slice(0, 7)}</td>
                    <td style={{ fontWeight: 600 }}>
                      {d.cantidad_predicha.toLocaleString('es-CO')}
                    </td>
                    <td style={{ color: '#16a34a', fontWeight: 500 }}>{d.confianza_pct}%</td>
                    <td>
                      <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}