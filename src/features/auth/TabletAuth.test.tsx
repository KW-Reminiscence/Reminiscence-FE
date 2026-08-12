import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/client'
import { TabletPairingPage } from '../../pages/TabletPairingPage'
import { TabletGuard } from './TabletGuard'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getTabletSession: vi.fn(),
  pairTablet: vi.fn(),
}))

const getTabletSession = vi.mocked(api.getTabletSession)
const pairTablet = vi.mocked(api.pairTablet)

afterEach(() => vi.clearAllMocks())

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/tablet']}>
      <Routes>
        <Route path="/tablet/pair" element={<p>태블릿 등록 화면</p>} />
        <Route element={<TabletGuard />}>
          <Route path="/tablet" element={<p>태블릿 홈</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Tablet authentication', () => {
  it('renders tablet content only after a valid session', async () => {
    getTabletSession.mockResolvedValue({
      role: 'TABLET',
      expires_at: '2026-08-14T09:00:00+09:00',
    })

    renderGuard()

    expect(screen.getByText('태블릿 확인 중')).toBeVisible()
    expect(await screen.findByText('태블릿 홈')).toBeVisible()
  })

  it('redirects an unpaired tablet to pairing', async () => {
    getTabletSession.mockRejectedValue(new api.ApiError(401, 'not paired'))

    renderGuard()

    expect(await screen.findByText('태블릿 등록 화면')).toBeVisible()
  })

  it('removes tablet content when the session expires', async () => {
    getTabletSession.mockResolvedValue({
      role: 'TABLET',
      expires_at: '2026-08-14T09:00:00+09:00',
    })
    renderGuard()
    expect(await screen.findByText('태블릿 홈')).toBeVisible()

    act(() => {
      window.dispatchEvent(new CustomEvent(api.AUTH_UNAUTHORIZED_EVENT, {
        detail: { role: 'TABLET' },
      }))
    })

    expect(await screen.findByText('태블릿 등록 화면')).toBeVisible()
    expect(screen.queryByText('태블릿 홈')).not.toBeInTheDocument()
  })

  it('returns to tablet after pairing succeeds', async () => {
    pairTablet.mockResolvedValue({
      role: 'TABLET',
      expires_at: '2026-08-14T09:00:00+09:00',
    })
    render(
      <MemoryRouter initialEntries={['/tablet/pair']}>
        <Routes>
          <Route path="/tablet/pair" element={<TabletPairingPage />} />
          <Route path="/tablet" element={<p>등록 완료 홈</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('pairing code'), {
      target: { value: 'tablet-code' },
    })
    fireEvent.click(screen.getByRole('button', { name: '태블릿 등록' }))

    await waitFor(() => expect(pairTablet).toHaveBeenCalledWith('tablet-code'))
    expect(await screen.findByText('등록 완료 홈')).toBeVisible()
  })
})
