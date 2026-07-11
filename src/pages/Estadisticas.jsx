import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, CartesianGrid
} from 'recharts'
import { getTendenciaMensual, getDistribucionArmas, getDepartamentos } from '../services/hurtosService'
import './Estadisticas.css'

const AÑOS = [
  '2010','2011','2012','2013','2014','2015','2016',
  '2017','2018','2019','2020','2021','2022','2023','2024','2025','2026'
]

function exportarCSV(tendencia, armas, depto, añoDesde, añoHasta) {
  const filasTendencia = [
    ['SECCIÓN', 'MES', 'COMERCIALES', 'RESIDENCIAS', 'TOTAL'],
    ...tendencia.map(r => [
      'Tendencia mensual', r.mes,
      r.comerciales, r.residencias,
      Number(r.comerciales) + Number(r.residencias)
    ])
  ]
  const filasArmas = [
    [],
    ['SECCIÓN', 'ARMA / MEDIO', 'TOTAL HURTOS'],
    ...armas.map(r => ['Top armas', r.arma_medio, r.total_hurtos])
  ]
  const metadatos = [
    [`Filtros: Departamento=${depto || 'Nacional'} | Desde=${añoDesde} | Hasta=${añoHasta}`],
    [`Exportado: ${new Date().toLocaleString('es-CO')}`],
    []
  ]
  const csv  = [...metadatos, ...filasTendencia, ...filasArmas].map(f => f.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `seph_estadisticas_${depto || 'nacional'}_${añoDesde}_${añoHasta}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Tooltip personalizado con tema claro
function TooltipClaro({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">📅 {label}</p>
      {payload.map((p, i) => (
        <p key={i} className="chart-tooltip-row" style={{ color: p.color }}>
          {p.name}: <strong>{Number(p.value).toLocaleString('es-CO')}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Estadisticas() {
  const [tendencia,  setTendencia]  = useState([])
  const [armas,      setArmas]      = useState([])
  const [deptos,     setDeptos]     = useState([])
  const [depto,      setDepto]      = useState('')
  const [añoDesde,   setAñoDesde]   = useState('2023')
  const [añoHasta,   setAñoHasta]   = useState('2026')
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    getDepartamentos().then(setDeptos).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const desde = `${añoDesde}-01-01`
    const hasta = `${añoHasta}-12-31`
    Promise.all([
      getTendenciaMensual(depto || null, desde, hasta),
      getDistribucionArmas(depto || null, desde, hasta)
    ])
      .then(([t, a]) => { setTendencia(t); setArmas(a) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [depto, añoDesde, añoHasta])

  const handleExportar = useCallback(() => {
    setExportando(true)
    try { exportarCSV(tendencia, armas, depto, añoDesde, añoHasta) }
    finally { setTimeout(() => setExportando(false), 1000) }
  }, [tendencia, armas, depto, añoDesde, añoHasta])

  const totalComerciales = tendencia.reduce((a, r) => a + Number(r.comerciales || 0), 0)
  const totalResidencias  = tendencia.reduce((a, r) => a + Number(r.residencias  || 0), 0)
  const totalGeneral      = totalComerciales + totalResidencias
  const hayFiltros        = depto || añoDesde !== '2023' || añoHasta !== '2026'

  return (
    <div>
      {/* Encabezado */}
      <div className="estadisticas-header">
        <h1 className="estadisticas-title">Estadísticas y Tendencias</h1>
      </div>

      {error && <div className="error" style={{ marginBottom: '16px' }}>❌ {error}</div>}

      {/* Panel de filtros */}
      <div className="filtros-panel">
        <div className="filtro-grupo">
          <span className="filtro-label">🗺️ Departamento</span>
          <select value={depto} onChange={e => setDepto(e.target.value)}>
            <option value="">🇨🇴 Nacional (todos)</option>
            {deptos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="filtros-divider" />

        <div className="filtro-grupo">
          <span className="filtro-label">📅 Desde</span>
          <select value={añoDesde} onChange={e => setAñoDesde(e.target.value)}>
            {AÑOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="filtro-grupo">
          <span className="filtro-label">📅 Hasta</span>
          <select value={añoHasta} onChange={e => setAñoHasta(e.target.value)}>
            {AÑOS.filter(a => a >= añoDesde).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {hayFiltros && (
          <button
            className="btn-limpiar"
            onClick={() => { setDepto(''); setAñoDesde('2023'); setAñoHasta('2026') }}
          >
            ✕ Limpiar
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="filtros-meta">
            {deptos.length} deptos · {tendencia.length} meses
          </span>
          <button
            className={`btn-exportar ${exportando ? 'exportando' : ''}`}
            onClick={handleExportar}
            disabled={exportando || loading || tendencia.length === 0}
          >
            {exportando ? '✅ Descargando...' : '⬇️ Exportar CSV'}
          </button>
        </div>
      </div>

      {/* KPIs del período */}
      {!loading && tendencia.length > 0 && (
        <div className="kpis-periodo">
          <div className="kpi-card">
            <div className="kpi-label">Total hurtos en el período</div>
            <div className="kpi-value">{totalGeneral.toLocaleString('es-CO')}</div>
            <div className="kpi-sub">{añoDesde}–{añoHasta} · {depto || 'Nacional'}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Hurtos comerciales</div>
            <div className="kpi-value kpi-value-comerciales">
              {totalComerciales.toLocaleString('es-CO')}
            </div>
            <div className="kpi-sub">
              {totalGeneral > 0 ? ((totalComerciales / totalGeneral) * 100).toFixed(1) : 0}% del total
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Hurtos en residencias</div>
            <div className="kpi-value kpi-value-residencias">
              {totalResidencias.toLocaleString('es-CO')}
            </div>
            <div className="kpi-sub">
              {totalGeneral > 0 ? ((totalResidencias / totalGeneral) * 100).toFixed(1) : 0}% del total
            </div>
          </div>
        </div>
      )}

      {/* Gráfica tendencia */}
      <div className="card" style={{ marginBottom: '18px' }}>
        <div className="card-header">
          <span className="card-title">
            📉 Tendencia mensual — {depto || 'Nacional'}
          </span>
          <span className="card-header-info">
            {tendencia.length} meses · {añoDesde}–{añoHasta}
          </span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading">⏳ Cargando tendencia...</div>
          ) : tendencia.length === 0 ? (
            <div className="loading">⚠️ Sin datos para los filtros seleccionados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={tendencia} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 10, fill: '#8a9bbf' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#8a9bbf' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v.toLocaleString('es-CO')}
                />
                <Tooltip content={<TooltipClaro />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Line
                  type="monotone" dataKey="comerciales"
                  stroke="#1a3a6b" dot={false} name="Comerciales"
                  strokeWidth={2.5} activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone" dataKey="residencias"
                  stroke="#dc2626" dot={false} name="Residencias"
                  strokeWidth={2.5} activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráfica armas */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            🔫 Top armas y medios — {depto || 'Nacional'}
          </span>
          <span className="card-header-info">{añoDesde}–{añoHasta}</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loading">⏳ Cargando...</div>
          ) : armas.length === 0 ? (
            <div className="loading">⚠️ Sin datos para los filtros seleccionados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={armas}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#8a9bbf' }}
                  tickLine={false}
                  tickFormatter={v => v.toLocaleString('es-CO')}
                />
                <YAxis
                  dataKey="arma_medio"
                  type="category"
                  tick={{ fontSize: 10, fill: '#5a6e8a' }}
                  width={180}
                  tickLine={false}
                />
                <Tooltip content={<TooltipClaro />} />
                <Bar
                  dataKey="total_hurtos"
                  fill="#1a3a6b"
                  name="Total hurtos"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}