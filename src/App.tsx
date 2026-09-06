import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { lazy, Suspense } from 'react'
const Maestro = lazy(()=> import('./pages/Maestro'))
const Ruta = lazy(()=> import('./pages/Ruta'))
const Horas = lazy(()=> import('./pages/Horas'))
const Params = lazy(()=> import('./pages/Params'))

export default function App(){
  return (
    <BrowserRouter>
      <nav className="nav" aria-label="Principal">
        <div className="nav__inner">
          <span className="nav__brand">Horas extra</span>
          <div className="nav__links">
            <NavLink to="/maestro" className={({isActive})=> isActive? 'active':''} aria-current={undefined}>Personal</NavLink>
            <NavLink to="/ruta">Ruta del día</NavLink>
            <NavLink to="/horas">Planilla</NavLink>
            <NavLink to="/params">Reglas</NavLink>
          </div>
          <span className="nav__aside">FORLI · SURYMAR · planilla</span>
        </div>
      </nav>
      <main className="shell">
        <Suspense fallback={<p className="help">Cargando…</p>}>
          <Routes>
            <Route path="/" element={<Maestro/>} />
            <Route path="/maestro" element={<Maestro/>} />
            <Route path="/ruta" element={<Ruta/>} />
            <Route path="/horas" element={<Horas/>} />
            <Route path="/params" element={<Params/>} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  )
}
