import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  ApiError,
  AUTH_UNAUTHORIZED_EVENT,
  getGuardianSession,
} from '../../api/client'

type SessionState = 'checking' | 'authenticated' | 'unauthenticated' | 'error'

export function GuardianGuard() {
  const location = useLocation()
  const [state, setState] = useState<SessionState>('checking')
  const [sequence, setSequence] = useState(0)
  const retry = useCallback(() => setSequence((value) => value + 1), [])

  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      if ((event as CustomEvent<{ role?: string }>).detail?.role === 'GUARDIAN') {
        setState('unauthenticated')
      }
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setState('checking')
    void getGuardianSession(controller.signal)
      .then((session) => {
        if (!controller.signal.aborted) {
          setState(session.role === 'GUARDIAN' ? 'authenticated' : 'unauthenticated')
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setState(cause instanceof ApiError && cause.status === 401 ? 'unauthenticated' : 'error')
      })
    return () => controller.abort()
  }, [sequence])

  if (state === 'unauthenticated') {
    return <Navigate replace state={{ from: location.pathname }} to="/dashboard/login" />
  }
  if (state === 'authenticated') return <Outlet />

  return (
    <main className="auth-page">
      <section className="auth-card" role="status">
        <h1>{state === 'error' ? '서버에 연결할 수 없어요.' : '보호자 확인 중'}</h1>
        <p>
          {state === 'error'
            ? '연결 상태를 확인한 뒤 다시 시도해주세요.'
            : '보호자 세션을 안전하게 확인하고 있어요.'}
        </p>
        {state === 'error' ? (
          <button type="button" onClick={retry}>다시 시도</button>
        ) : null}
      </section>
    </main>
  )
}
