import { Navigate, Route, Routes } from 'react-router-dom'
import { CarePage } from './pages/CarePage'
import { DashboardPage } from './pages/DashboardPage'
import { PageIndex } from './pages/PageIndex'
import { TabletPage } from './pages/TabletPage'
import { carePages } from './pages/carePages'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PageIndex />} />
      <Route path="/tablet" element={<TabletPage />} />
      {carePages.map((page) => (
        <Route
          key={page.path}
          path={page.path}
          element={<CarePage page={page} />}
        />
      ))}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/404" element={<PageIndex notFound />} />
      <Route path="*" element={<Navigate replace to="/404" />} />
    </Routes>
  )
}
