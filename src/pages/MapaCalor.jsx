import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet'
import { getDatosMapa } from '../services/hurtosService'
import './MapaCalor.css'

const AÑOS = [
  '2010','2011','2012','2013','2014','2015','2016',
  '2017','2018','2019','2020','2021','2022','2023','2024','2025','2026'
]

const LEYENDA = [
  { color: '#22c55e', label: 'Bajo'    },
  { color: '#eab308', label: 'Medio'   },
  { color: '#f97316', label: 'Alto'    },
  { color: '#ef4444', label: 'Crítico' },
]

function getColor(valor, max) {
  const r = valor / max
  if (r > 0.6) return '#ef4444'
  if (r > 0.3) return '#f97316'
  if (r > 0.1) return '#eab308'
  return '#22c55e'
}

function getRadio(valor, max) {
  const r = valor / max
  if (r > 0.6) return 22
  if (r > 0.3) return 16
  if (r > 0.1) return 10
  return 6
}

function getNivel(valor, max) {
  const r = valor / max
  if (r > 0.6) return { label: 'CRÍTICO', cls: 'badge-alto'  }
  if (r > 0.3) return { label: 'ALTO',    cls: 'badge-alto'  }
  if (r > 0.1) return { label: 'MEDIO',   cls: 'badge-medio' }
  return              { label: 'BAJO',    cls: 'badge-bajo'  }
}

export default function MapaCalor() {
  const [datos,     setDatos]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [tipoHurto, setTipoHurto] = useState('')
  const [añoDesde,  setAñoDesde]  = useState('2020')
  const [añoHasta,  setAñoHasta]  = useState('2026')
  const [busqueda,  setBusqueda]  = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    getDatosMapa(tipoHurto || null, `${añoDesde}-01-01`, `${añoHasta}-12-31`)
      .then(setDatos)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [tipoHurto, añoDesde, añoHasta])

  const max = useMemo(
    () => Math.max(...datos.map(d => Number(d.total_hurtos)), 1),
    [datos]
  )

  const datosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return datos
    const q = busqueda.toLowerCase()
    return datos.filter(d =>
      d.municipio?.toLowerCase().includes(q) ||
      d.departamento?.toLowerCase().includes(q)
    )
  }, [datos, busqueda])

  const totalHurtos = datosFiltrados.reduce((a, d) => a + Number(d.total_hurtos), 0)

  return (
    <div>
      {/* Encabezado */}
      <div className="mapa-header">
        <div>
          <h1 className="mapa-title">Mapa de Calor — Hurtos por Municipio</h1>
          <p className="mapa-subtitle">
            Visualización geoespacial de incidencia delictiva · Colombia
          </p>
        </div>
      </div>

      {error && <div className="error" style={{ marginBottom: '16px' }}>❌ {error}</div>}

      {/* Filtros */}
      <div className="mapa-filtros">
        <div className="mapa-filtro-grupo">
          <span className="mapa-filtro-label">🏷️ Tipo</span>
          <select value={tipoHurto} onChange={e => setTipoHurto(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="ART239-COM">Entidades Comerciales</option>
            <option value="ART239-RES">Residencias</option>
          </select>
        </div>

        <div className="mapa-filtros-divider" />

        <div className="mapa-filtro-grupo">
          <span className="mapa-filtro-label">📅 Desde</span>
          <select value={añoDesde} onChange={e => setAñoDesde(e.target.value)}>
            {AÑOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="mapa-filtro-grupo">
          <span className="mapa-filtro-label">📅 Hasta</span>
          <select value={añoHasta} onChange={e => setAñoHasta(e.target.value)}>
            {AÑOS.filter(a => a >= añoDesde).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="mapa-filtros-divider" />

        <input
          type="text"
          className="mapa-busqueda"
          placeholder="🔍 Buscar municipio o depto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        <span className="mapa-filtros-meta">
          {loading
            ? '⏳ Cargando...'
            : `${datosFiltrados.length} municipios · ${totalHurtos.toLocaleString('es-CO')} hurtos`
          }
        </span>
      </div>

      {/* KPIs */}
      {!loading && datos.length > 0 && (
        <div className="mapa-kpis">
          {[
            {
              label: 'Municipios en mapa',
              valor: datosFiltrados.length,
              sub:   'con coordenadas',
              big:   true,
            },
            {
              label: 'Total hurtos',
              valor: totalHurtos.toLocaleString('es-CO'),
              sub:   `${añoDesde}–${añoHasta}`,
              big:   true,
            },
            {
              label: 'Municipio crítico',
              valor: datosFiltrados[0]?.municipio ?? '—',
              sub:   datosFiltrados[0]?.departamento ?? '',
              big:   false,
            },
            {
              label: 'Máx. hurtos',
              valor: Number(datosFiltrados[0]?.total_hurtos ?? 0).toLocaleString('es-CO'),
              sub:   'en un municipio',
              big:   true,
            },
          ].map((k, i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div
                className="kpi-value"
                style={{ fontSize: k.big ? '22px' : '14px', paddingTop: k.big ? 0 : '4px' }}
              >
                {k.valor}
              </div>
              <div className="kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Mapa */}
      <div className="card mapa-card">
        <div className="card-header">
          <span className="card-title">🌡️ Intensidad de hurtos por municipio</span>
          <div className="mapa-leyenda">
            {LEYENDA.map(l => (
              <span key={l.label} className="mapa-leyenda-item">
                <span className="mapa-leyenda-dot" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mapa-container">
          {loading ? (
            <div className="loading" style={{ paddingTop: '200px' }}>
              ⏳ Cargando datos del mapa...
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
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              {datosFiltrados.map((d, i) => {
                const total = Number(d.total_hurtos)
                const color = getColor(total, max)
                const radio = getRadio(total, max)
                const nivel = getNivel(total, max)
                return (
                  <CircleMarker
                    key={i}
                    center={[Number(d.lat), Number(d.lng)]}
                    radius={radio}
                    pathOptions={{
                      color:       color,
                      fillColor:   color,
                      fillOpacity: 0.65,
                      weight:      1.5,
                    }}
                  >
                    <Popup>
                      <div className="mapa-popup">
                        <p className="mapa-popup-titulo">📍 {d.municipio}</p>
                        <p className="mapa-popup-depto">{d.departamento}</p>
                        <p className="mapa-popup-dato">
                          Total hurtos: <strong>{total.toLocaleString('es-CO')}</strong>
                        </p>
                        <span className={`badge ${nivel.cls}`} style={{ marginTop: '6px', display: 'inline-block' }}>
                          {nivel.label}
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

      {/* Tabla top 10 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🏆 Top 10 municipios más afectados</span>
          <span className="mapa-tabla-header-info">{añoDesde}–{añoHasta}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Municipio</th>
                <th>Departamento</th>
                <th>Total hurtos</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.slice(0, 10).map((d, i) => {
                const nivel = getNivel(Number(d.total_hurtos), max)
                return (
                  <tr key={i}>
                    <td style={{ color: '#8a9bbf', fontWeight: 500 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{d.municipio}</td>
                    <td style={{ color: '#5a6e8a' }}>{d.departamento}</td>
                    <td style={{ fontWeight: 600 }}>{Number(d.total_hurtos).toLocaleString('es-CO')}</td>
                    <td><span className={`badge ${nivel.cls}`}>{nivel.label}</span></td>
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