import { Navigate, Route, Routes } from 'react-router-dom'
import { useMealPeriod } from './features/routine/useMealPeriod'
import { GuardianGuard } from './features/auth/GuardianGuard'
import { TabletGuard } from './features/auth/TabletGuard'
import { CarePage } from './pages/CarePage'
import { ConversationPage } from './pages/ConversationPage'
import { DashboardPage } from './pages/DashboardPage'
import { GuardianLoginPage } from './pages/GuardianLoginPage'
import { PageIndex } from './pages/PageIndex'
import { RoutineDemoPage } from './pages/RoutineDemoPage'
import { TabletPage } from './pages/TabletPage'
import { TabletPairingPage } from './pages/TabletPairingPage'
import {
  createCarePages,
  createRoutineDemoSteps,
  findRoutineDemoStep,
} from './pages/carePages'

export function App() {
  const mealPeriod = useMealPeriod()
  const routineDemoSteps = createRoutineDemoSteps(mealPeriod)
  const carePages = createCarePages(mealPeriod, routineDemoSteps)

  return (
    <Routes>
      <Route path="/" element={<PageIndex pages={carePages} />} />
      <Route path="/tablet/pair" element={<TabletPairingPage />} />
      <Route element={<TabletGuard />}>
        <Route path="/tablet" element={<TabletPage />} />
        <Route path="/conversation" element={<ConversationPage />} />
      </Route>
      {carePages.map((page) => {
        const routineStep = findRoutineDemoStep(page.path, routineDemoSteps)
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
      <Route path="/dashboard/login" element={<GuardianLoginPage />} />
      <Route element={<GuardianGuard />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="/404" element={<PageIndex pages={carePages} notFound />} />
      <Route path="*" element={<Navigate replace to="/404" />} />
    </Routes>
  )
}
