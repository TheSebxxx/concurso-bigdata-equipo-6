import { supabase } from './supabaseClient'

export async function getKPIs() {
  const { data, error } = await supabase
    .from('v_ranking_municipios')
    .select('municipio, departamento, total_hurtos, tipo_hurto_codigo')
  if (error) throw error
  const total = data.reduce((acc, r) => acc + Number(r.total_hurtos), 0)
  const top   = data.reduce((a, b) => Number(a.total_hurtos) > Number(b.total_hurtos) ? a : b)
  const comerciales = data.filter(r => r.tipo_hurto_codigo === 'ART239-COM').reduce((acc, r) => acc + Number(r.total_hurtos), 0)
  return { total, topMunicipio: top.municipio, topDepartamento: top.departamento, pctComerciales: ((comerciales/total)*100).toFixed(1) }
}

export async function getRankingMunicipios(tipoHurto = null) {
  let query = supabase
    .from('v_ranking_municipios')
    .select('municipio, departamento, codigo_dane, total_hurtos, tipo_hurto_codigo')
    .order('total_hurtos', { ascending: false })
    .limit(200)
  if (tipoHurto) query = query.eq('tipo_hurto_codigo', tipoHurto)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTendenciaMensual(departamento = null, fechaDesde = '2023-01-01', fechaHasta = '2026-12-31') {
  const { data, error } = await supabase
    .rpc('get_tendencia_mensual', {
      p_departamento: departamento || null,
      p_fecha_desde:  fechaDesde,
      p_fecha_hasta:  fechaHasta,
    })
  if (error) throw error
  return data
}

export async function getDistribucionArmas(departamento = null, fechaDesde = '2010-01-01', fechaHasta = '2026-12-31') {
  const { data, error } = await supabase
    .rpc('get_distribucion_armas', {
      p_departamento: departamento || null,
      p_fecha_desde:  fechaDesde,
      p_fecha_hasta:  fechaHasta,
    })
  if (error) throw error
  return data
}

export async function getDepartamentos() {
  const pageSize = 1000
  let pagina = 0, todos = [], hayMas = true
  while (hayMas) {
    const { data, error } = await supabase
      .from('ubicaciones').select('departamento').order('departamento')
      .range(pagina * pageSize, (pagina + 1) * pageSize - 1)
    if (error) throw error
    todos = todos.concat(data)
    hayMas = data.length === pageSize
    pagina++
  }
  return [...new Set(todos.map(d => d.departamento.trim()))].sort()
}

export async function getDatosMapa(tipoHurto = null, fechaDesde = '2010-01-01', fechaHasta = '2026-12-31') {
  const { data, error } = await supabase
    .rpc('get_datos_mapa', {
      p_tipo_hurto:  tipoHurto  || null,
      p_fecha_desde: fechaDesde,
      p_fecha_hasta: fechaHasta,
    })
  if (error) throw error
  // Filtrar solo municipios que tengan coordenadas válidas
  return data.filter(d => d.lat && d.lng)
}

export async function getPredicciones(tipoHurto = null, nivel = null) {
  let query = supabase
    .from('predicciones')
    .select(`
      id,
      periodo_prediccion,
      cantidad_predicha,
      nivel_riesgo,
      confianza_pct,
      modelo_version,
      ubicaciones(municipio, departamento, lat, lng),
      tipos_hurto(codigo)
    `)
    .order('cantidad_predicha', { ascending: false })
    .limit(500)

  if (nivel)     query = query.eq('nivel_riesgo', nivel)
  if (tipoHurto) query = query.eq('tipos_hurto.codigo', tipoHurto)

  const { data, error } = await query
  if (error) throw error

  return data
    .filter(d => d.ubicaciones?.lat && d.ubicaciones?.lng)
    .map(d => ({
      id:                  d.id,
      municipio:           d.ubicaciones.municipio,
      departamento:        d.ubicaciones.departamento,
      lat:                 d.ubicaciones.lat,
      lng:                 d.ubicaciones.lng,
      tipo_hurto_codigo:   d.tipos_hurto.codigo,
      periodo_prediccion:  d.periodo_prediccion,
      cantidad_predicha:   Number(d.cantidad_predicha),
      nivel_riesgo:        d.nivel_riesgo,
      confianza_pct:       Number(d.confianza_pct),
      modelo_version:      d.modelo_version,
    }))
}