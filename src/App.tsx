import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { publicAssetPath } from './config/paths'
import { GuardianGuard } from './features/auth/GuardianGuard'
import { TabletGuard } from './features/auth/TabletGuard'
import { useMealPeriod } from './features/routine/useMealPeriod'
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
  prefixCarePage,
  prefixRoutineDemoStep,
} from './pages/carePages'

function LegacyDemoRedirect() {
  const location = useLocation()
  return <Navigate replace to={`/demo${location.pathname}${location.search}`} />
}

export function App() {
  const mealPeriod = useMealPeriod()
  const routineDemoSteps = createRoutineDemoSteps(mealPeriod).map((step) =>
    prefixRoutineDemoStep(step, '/demo'),
  )
  const demoPages = createCarePages(mealPeriod).map((page) =>
    prefixCarePage(page, '/demo'),
  )

  return (
    <Routes>
      <Route path="/tablet/pair" element={<TabletPairingPage />} />
      <Route path="/tablet" element={<Navigate replace to="/" />} />
      <Route element={<TabletGuard />}>
        <Route path="/" element={<TabletPage />} />
        <Route path="/conversation" element={<ConversationPage />} />
      </Route>

      <Route path="/dashboard/login" element={<GuardianLoginPage />} />
      <Route element={<GuardianGuard />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route
        path="/demo"
        element={<PageIndex pages={demoPages} startPath="/demo/care/breakfast" />}
      />
      {demoPages.map((page) => {
        const routineStep = routineDemoSteps.find(
          ({ page: stepPage }) => stepPage.path === page.path,
        )
        return (
          <Route
            key={page.path}
            path={page.path}
            element={
              routineStep ? (
                <RoutineDemoPage key={routineStep.page.path} step={routineStep} />
              ) : (
                <CarePage
                  page={page}
                  imageUrl={publicAssetPath('family-photo.png')}
                  imageAlt="한자리에 모여 웃고 있는 AI 생성 가족"
                />
              )
            }
          />
        )
      })}
      <Route
        path="/demo/404"
        element={<PageIndex pages={demoPages} notFound startPath="/demo/care/breakfast" />}
      />
      <Route path="/care/*" element={<LegacyDemoRedirect />} />
      <Route path="/conversation/start" element={<LegacyDemoRedirect />} />
      <Route path="/conversation/active" element={<LegacyDemoRedirect />} />
      <Route path="/conversation/connecting" element={<LegacyDemoRedirect />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
