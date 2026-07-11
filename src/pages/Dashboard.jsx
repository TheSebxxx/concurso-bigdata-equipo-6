import { useEffect, useState } from 'react'
import { getKPIs, getRankingMunicipios } from '../services/hurtosService'
import './Dashboard.css'

export default function Dashboard() {
  const [kpis,    setKpis]    = useState(null)
  const [ranking, setRanking] = useState([])
  const [filtro,  setFiltro]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    async function cargar() {
      try {
        setLoading(true)
        const [k, r] = await Promise.all([
          getKPIs(),
          getRankingMunicipios(filtro)
        ])
        setKpis(k)
        setRanking(r)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [filtro])

  if (loading) return <div className="loading">⏳ Cargando datos...</div>
  if (error)   return <div className="error">❌ Error: {error}</div>

  return (
    <div>
      {/* Encabezado */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard — Hurtos en Colombia</h1>
          <p className="dashboard-subtitle">
            Fuente: Policía Nacional · Dataset 2010–2026 · {ranking.length > 0 ? `${ranking.length} municipios cargados` : ''}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total hurtos registrados</div>
          <div className="kpi-value">{Number(kpis.total).toLocaleString('es-CO')}</div>
          <div className="kpi-sub kpi-up">▲ Dataset Policía Nacional</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Municipio más crítico</div>
          <div className="kpi-value" style={{ fontSize: '16px', paddingTop: '4px' }}>
            {kpis.topMunicipio}
          </div>
          <div className="kpi-sub">{kpis.topDepartamento}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Tipo prevalente</div>
          <div className="kpi-value" style={{ fontSize: '15px', paddingTop: '4px' }}>
            Ent. Comerciales
          </div>
          <div className="kpi-sub kpi-up">{kpis.pctComerciales}% del total</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Municipios monitoreados</div>
          <div className="kpi-value">2,150</div>
          <div className="kpi-sub kpi-down">↓ Cobertura 2010–2026</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filter-row">
        <button
          className={`filter-chip ${!filtro ? 'active' : ''}`}
          onClick={() => setFiltro(null)}
        >
          Todos
        </button>
        <button
          className={`filter-chip ${filtro === 'ART239-COM' ? 'active' : ''}`}
          onClick={() => setFiltro('ART239-COM')}
        >
          Comerciales
        </button>
        <button
          className={`filter-chip ${filtro === 'ART239-RES' ? 'active' : ''}`}
          onClick={() => setFiltro('ART239-RES')}
        >
          Residencias
        </button>
      </div>

      {/* Tabla ranking */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"> Top 200 municipios por hurtos</span>
          <span className="ranking-count">{ranking.length} registros</span>
        </div>
        <div className="ranking-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Municipio</th>
                <th>Departamento</th>
                <th>Tipo</th>
                <th>Total hurtos</th>
                <th>Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => {
                const total = Number(r.total_hurtos)
                const nivel = total > 5000 ? 'alto' : total > 1000 ? 'medio' : 'bajo'
                return (
                  <tr key={i}>
                    <td style={{ color: '#8a9bbf', fontWeight: 500 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{r.municipio}</td>
                    <td style={{ color: '#5a6e8a' }}>{r.departamento}</td>
                    <td>
                      <span style={{
                        fontSize: '11px',
                        color: r.tipo_hurto_codigo === 'ART239-COM' ? '#1a3a6b' : '#7c3aed',
                        fontWeight: 500
                      }}>
                        {r.tipo_hurto_codigo === 'ART239-COM' ? 'Comercial' : 'Residencia'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{total.toLocaleString('es-CO')}</td>
                    <td>
                      <span className={`badge badge-${nivel}`}>
                        {nivel.toUpperCase()}
                      </span>
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