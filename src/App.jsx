import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard       from './pages/Dashboard'
import Recomendaciones from './pages/Recomendaciones'
import Estadisticas    from './pages/Estadisticas'
import MapaCalor       from './pages/MapaCalor'
import Predicciones    from './pages/Predicciones'
import Chatbot         from './components/Chatbot'
import Reportes        from './pages/Reportes'
import Admin           from './pages/admin/Admin'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">

        <aside className="sidebar">
          {/* Brand / Logo — solo imagen, más grande */}
          <div className="logo" style={{
            padding: '16px',
            borderBottom: '1px solid #e2e6ed',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <img
              src="/Logo_SEPH.png"
              alt="Logo SEPH Colombia"
              style={{ width: '130px', height: 'auto', objectFit: 'contain' }}
            />
          </div>

          <nav style={{ flex: 1, paddingTop: '8px' }}>
            <p className="nav-section-label">Principal</p>
            <NavLink to="/"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Dashboard
            </NavLink>
            <NavLink to="/mapa"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Mapa de Calor
            </NavLink>
            <NavLink to="/predicciones"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Predicciones
            </NavLink>
            <NavLink to="/estadisticas"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Estadísticas
            </NavLink>

            <p className="nav-section-label" style={{ marginTop: '8px' }}>Ciudadanía</p>
            <NavLink to="/reportes"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Reportes
            </NavLink>
            <NavLink to="/recomendaciones"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Recomendaciones
            </NavLink>

            {/* 🔐 NUEVA SECCIÓN DE ADMINISTRACIÓN ADICIONADA */}
            <p className="nav-section-label" style={{ marginTop: '8px' }}>Gestión</p>
            <NavLink to="/admin"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
               Panel Admin
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/"                element={<Dashboard />} />
            <Route path="/mapa"            element={<MapaCalor />} />
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