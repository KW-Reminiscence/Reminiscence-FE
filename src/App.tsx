import { Navigate, Route, Routes } from 'react-router-dom'
import { CarePage } from './pages/CarePage'
import { ConversationPage } from './pages/ConversationPage'
import { DashboardPage } from './pages/DashboardPage'
import { PageIndex } from './pages/PageIndex'
import { RoutineDemoPage } from './pages/RoutineDemoPage'
import { TabletPage } from './pages/TabletPage'
import { carePages, findRoutineDemoStep } from './pages/carePages'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PageIndex />} />
      <Route path="/tablet" element={<TabletPage />} />
      <Route path="/conversation" element={<ConversationPage />} />
      {carePages.map((page) => {
        const routineStep = findRoutineDemoStep(page.path)
        return (
          <Route
            key={page.path}
            path={page.path}
            element={
              routineStep ? (
                <RoutineDemoPage
                  key={routineStep.page.path}
                  step={routineStep}
                />
              ) : (
                <CarePage page={page} />
              )
            }
          />
        )
      })}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/404" element={<PageIndex notFound />} />
      <Route path="*" element={<Navigate replace to="/404" />} />
    </Routes>
  )
}
