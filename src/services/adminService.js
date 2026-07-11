import { supabase } from './supabaseClient'

const ADMIN_KEY = 'seph_admin_session'

// ── Login ─────────────────────────────────────────────────────
export async function loginAdmin(email, password) {
  const { data, error } = await supabase
    .rpc('verificar_admin', {
      p_email:    email.trim().toLowerCase(),
      p_password: password,
    })

  if (error) throw new Error('Error de conexión. Intenta de nuevo.')
  if (!data || data.length === 0) throw new Error('Credenciales incorrectas.')

  const admin = data[0]
  if (!admin.activo) throw new Error('Tu cuenta está desactivada.')

  // Guardar sesión en sessionStorage
  sessionStorage.setItem(ADMIN_KEY, JSON.stringify({
    id:     admin.id,
    email:  admin.email,
    nombre: admin.nombre,
    rol:    admin.rol,
  }))

  return admin
}

export function getAdminSesion() {
  try {
    const raw = sessionStorage.getItem(ADMIN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_KEY)
}

export function esSuperAdmin() {
  return getAdminSesion()?.rol === 'superadmin'
}

// ── CRUD admins ───────────────────────────────────────────────
export async function getAdmins() {
  const { data, error } = await supabase
    .from('admins')
    .select('id, email, nombre, rol, activo, created_at, created_by')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function crearAdmin({ email, nombre, rol, password }) {
  const { data, error } = await supabase.rpc('crear_admin', {
    p_email:      email.trim().toLowerCase(),
    p_nombre:     nombre.trim(),
    p_rol:        rol,
    p_password:   password,
    p_created_by: getAdminSesion()?.id ?? null,
  })
  if (error) throw error
  return data
}

export async function editarAdmin(id, { nombre, rol, activo }) {
  const { error } = await supabase
    .from('admins')
    .update({ nombre, rol, activo, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function eliminarAdmin(id) {
  const sesion = getAdminSesion()
  if (sesion?.id === id) throw new Error('No puedes eliminarte a ti mismo.')
  const { error } = await supabase
    .from('admins')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}

// ── CRUD recomendaciones ──────────────────────────────────────
export async function getRecomendacionesAdmin() {
  const { data, error } = await supabase
    .from('recomendaciones')
    .select('*')
    .order('nivel_riesgo')
    .order('titulo')
  if (error) throw error
  return data
}

export async function crearRecomendacion(campos) {
  const { data, error } = await supabase
    .from('recomendaciones')
    .insert(campos)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function editarRecomendacion(id, campos) {
  const { error } = await supabase
    .from('recomendaciones')
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function eliminarRecomendacion(id) {
  const { error } = await supabase
    .from('recomendaciones')
    .update({ activa: false })
    .eq('id', id)
  if (error) throw error
}

// ── Reportes ciudadanos ───────────────────────────────────────
export async function getReportesAdmin() {
  const { data, error } = await supabase
    .from('reportes_ciudadanos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function eliminarReporte(id) {
  const { error } = await supabase
    .from('reportes_ciudadanos')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}

// ── Feedback chatbot ──────────────────────────────────────────
export async function getFeedback() {
  const { data, error } = await supabase
    .from('interacciones')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data
}

// ── Ingesta del dataset ───────────────────────────────────────
export async function getIngestas() {
  const { data, error } = await supabase
    .from('ingestas_dataset')
    .select('*')
    .order('iniciado_en', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

// ── Predicciones ──────────────────────────────────────────────
export async function getEstadoPredicciones() {
  const { data, error } = await supabase
    .from('predicciones')
    .select('modelo_version, generado_en, nivel_riesgo')
    .order('generado_en', { ascending: false })
    .limit(1)
    .single()
  if (error) return null
  return data
}