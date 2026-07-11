import { supabase } from './supabaseClient'

// ── Autenticación con X ───────────────────────────────────────
export async function loginConX() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'x'
  })
  if (error) throw error
}

export async function cerrarSesion() {
  await supabase.auth.signOut()
}

export async function getUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Reportes ──────────────────────────────────────────────────
export async function getReportes(pagina = 0) {
  const pageSize = 10
  const { data, error } = await supabase
    .from('reportes_ciudadanos')
    .select('*')
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .range(pagina * pageSize, (pagina + 1) * pageSize - 1)

  if (error) throw error
  return data
}

export async function crearReporte(reporte, imagen) {
  const user = await getUsuarioActual()
  if (!user) throw new Error('Debes iniciar sesión para publicar')

  let imagen_url = null

  // Subir imagen si existe
  if (imagen) {
    const ext      = imagen.name.split('.').pop()
    const nombre   = `${user.id}/${Date.now()}.${ext}`
    const { error: errImg } = await supabase.storage
      .from('reportes-imagenes')
      .upload(nombre, imagen, { contentType: imagen.type })

    if (errImg) throw errImg

    const { data: urlData } = supabase.storage
      .from('reportes-imagenes')
      .getPublicUrl(nombre)

    imagen_url = urlData.publicUrl
  }

  const { data, error } = await supabase
    .from('reportes_ciudadanos')
    .insert({
      titulo:       reporte.titulo,
      descripcion:  reporte.descripcion,
      tipo_hurto:   reporte.tipo_hurto,
      municipio:    reporte.municipio,
      departamento: reporte.departamento,
      imagen_url,
      user_id:      user.id,
      autor_nombre: user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'Usuario X',
      autor_avatar: user.user_metadata?.avatar_url ?? null,
      red_social:   'x',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Interacciones ─────────────────────────────────────────────
export async function toggleLike(reporteId) {
  const user = await getUsuarioActual()
  if (!user) throw new Error('Debes iniciar sesión')

  // Verificar si ya dio like
  const { data: existente } = await supabase
    .from('interacciones')
    .select('id')
    .eq('reporte_id', reporteId)
    .eq('user_id', user.id)
    .eq('tipo', 'like')
    .maybeSingle()

  if (existente) {
    // Quitar like
    await supabase.from('interacciones').delete().eq('id', existente.id)
    return false
  } else {
    // Dar like
    await supabase.from('interacciones').insert({
      reporte_id: reporteId,
      user_id:    user.id,
      tipo:       'like'
    })
    return true
  }
}

export async function agregarComentario(reporteId, contenido) {
  const user = await getUsuarioActual()
  if (!user) throw new Error('Debes iniciar sesión')

  const { data, error } = await supabase
    .from('interacciones')
    .insert({
      reporte_id: reporteId,
      user_id:    user.id,
      tipo:       'comentario',
      contenido,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getComentarios(reporteId) {
  const { data, error } = await supabase
    .from('interacciones')
    .select('*')
    .eq('reporte_id', reporteId)
    .eq('tipo', 'comentario')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getTop3Semanal() {
  const { data, error } = await supabase
    .from('v_top3_semanal')
    .select('*')

  if (error) throw error
  return data
}

export async function getMetricas() {
  const { data, error } = await supabase
    .from('v_metricas_reportes')
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getMisLikes(reporteIds) {
  const user = await getUsuarioActual()
  if (!user) return []

  const { data } = await supabase
    .from('interacciones')
    .select('reporte_id')
    .eq('user_id', user.id)
    .eq('tipo', 'like')
    .in('reporte_id', reporteIds)

  return data?.map(d => d.reporte_id) ?? []
}