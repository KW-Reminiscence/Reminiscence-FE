import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/client'
import { GuardianLoginPage } from '../../pages/GuardianLoginPage'
import { GuardianGuard } from './GuardianGuard'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getGuardianSession: vi.fn(),
  guardianLogin: vi.fn(),
}))

const getGuardianSession = vi.mocked(api.getGuardianSession)
const guardianLogin = vi.mocked(api.guardianLogin)

afterEach(() => vi.clearAllMocks())

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard/login" element={<p>로그인 화면</p>} />
        <Route element={<GuardianGuard />}>
          <Route path="/dashboard" element={<p>보호자 기록</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Guardian authentication', () => {
  it('renders protected content only after a valid guardian session', async () => {
    getGuardianSession.mockResolvedValue({
      role: 'GUARDIAN',
      expires_at: '2026-08-14T09:00:00+09:00',
    })

    renderGuard()

    expect(screen.getByText('보호자 확인 중')).toBeVisible()
    expect(await screen.findByText('보호자 기록')).toBeVisible()
  })

  it('redirects an unauthenticated direct dashboard visit to login', async () => {
    getGuardianSession.mockRejectedValue(new api.ApiError(401, 'not authenticated'))

    renderGuard()

    expect(await screen.findByText('로그인 화면')).toBeVisible()
    expect(screen.queryByText('보호자 기록')).not.toBeInTheDocument()
  })

  it('removes protected content when an active session expires', async () => {
    getGuardianSession.mockResolvedValue({
      role: 'GUARDIAN',
      expires_at: '2026-08-14T09:00:00+09:00',
    })
    renderGuard()
    expect(await screen.findByText('보호자 기록')).toBeVisible()

    act(() => {
      window.dispatchEvent(new CustomEvent(api.AUTH_UNAUTHORIZED_EVENT, {
        detail: { role: 'GUARDIAN' },
      }))
    })

    expect(await screen.findByText('로그인 화면')).toBeVisible()
    expect(screen.queryByText('보호자 기록')).not.toBeInTheDocument()
  })

  it('navigates to the dashboard after password login succeeds', async () => {
    guardianLogin.mockResolvedValue({
      role: 'GUARDIAN',
      expires_at: '2026-08-14T09:00:00+09:00',
    })
    render(
      <MemoryRouter initialEntries={['/dashboard/login']}>
        <Routes>
          <Route path="/dashboard/login" element={<GuardianLoginPage />} />
          <Route path="/dashboard" element={<p>대시보드 도착</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('보호자 비밀번호'), {
      target: { value: 'guardian-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(guardianLogin).toHaveBeenCalledWith('guardian-password'))
    expect(await screen.findByText('대시보드 도착')).toBeVisible()
  })
})
