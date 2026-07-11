import { useState, useEffect } from 'react'
import { getAdminSesion } from '../../services/adminService'
import AdminLogin from './AdminLogin'
import AdminPanel from './AdminPanel'

export default function Admin() {
  const [admin, setAdmin] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const sesion = getAdminSesion()
    if (sesion) setAdmin(sesion)
    setChecking(false)
  }, [])

  if (checking) return null
  if (!admin) return <AdminLogin onLogin={a => setAdmin(a)} />
  return <AdminPanel admin={admin} onLogout={() => setAdmin(null)} />
}