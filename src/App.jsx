import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard       from './pages/Dashboard'
import Recomendaciones from './pages/Recomendaciones'
import Estadisticas    from './pages/Estadisticas'
import MapaCalor       from './pages/MapaCalor'
import Predicciones    from './pages/Predicciones'
import Chatbot         from './components/Chatbot'
import Reportes        from './pages/Reportes'
import Admin           from './pages/admin/Admin'

// Hook del Contador de Visitas
import { usePageView } from './hooks/usePageView'

import './App.css'

export default function App() {
  // Registrar automáticamente la visita en Supabase
  usePageView();

  // Estado para controlar el menú móvil
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <BrowserRouter>
      <div className="app-layout">

        {/* Encabezado móvil con botón de menú hamburguesa */}
        <header className="mobile-header">
          <img
            src="/Logo_SEPH.png"
            alt="Logo SEPH"
            className="mobile-logo"
          />
          <button className="menu-toggle-btn" onClick={toggleMenu} aria-label="Abrir menú">
            {menuOpen ? '✕' : '☰'}
          </button>
        </header>

        {/* Sidebar / Menú lateral (se convierte en desplegable en móviles) */}
        <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
          <div className="logo sidebar-logo">
            <img
              src="/Logo_SEPH.png"
              alt="Logo SEPH Colombia"
              style={{ width: '130px', height: 'auto', objectFit: 'contain' }}
            />
          </div>

          <nav style={{ flex: 1, paddingTop: '8px' }}>
            <p className="nav-section-label">Principal</p>
            <NavLink to="/" onClick={closeMenu}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Dashboard
            </NavLink>
            <NavLink to="/mapa" onClick={closeMenu}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Mapa de Calor
            </NavLink>
            <NavLink to="/predicciones" onClick={closeMenu}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Predicciones
            </NavLink>
            <NavLink to="/estadisticas" onClick={closeMenu}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Estadísticas
            </NavLink>

            <p className="nav-section-label" style={{ marginTop: '8px' }}>Ciudadanía</p>
            <NavLink to="/reportes" onClick={closeMenu}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Reportes
            </NavLink>
            <NavLink to="/recomendaciones" onClick={closeMenu}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Recomendaciones
            </NavLink>

            <p className="nav-section-label" style={{ marginTop: '8px' }}>Gestión</p>
            <NavLink to="/admin" onClick={closeMenu}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Panel Admin
            </NavLink>
          </nav>
        </aside>

        {/* Overlay oscuro para cerrar el menú al hacer clic afuera en móviles */}
        {menuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}

        <main className="main-content">
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/mapa"           element={<MapaCalor />} />
            <Route path="/predicciones"    element={<Predicciones />} />
            <Route path="/estadisticas"    element={<Estadisticas />} />
            <Route path="/recomendaciones" element={<Recomendaciones />} />
            <Route path="/reportes"        element={<Reportes />} />
            <Route path="/admin"           element={<Admin />} />
          </Routes>
        </main>
      </div>

      <Chatbot />
    </BrowserRouter>
  )
}