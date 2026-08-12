import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { guardianLogout } from '../api/client'
import { useDashboardData } from '../features/dashboard/useDashboardData'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  guardianLogout: vi.fn(),
}))
vi.mock('../features/dashboard/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}))

const logout = vi.mocked(guardianLogout)
const useDashboard = vi.mocked(useDashboardData)

afterEach(() => vi.clearAllMocks())

describe('Dashboard logout', () => {
  it('keeps the protected page visible and reports a failed logout', async () => {
    logout.mockRejectedValue(new Error('offline'))
    useDashboard.mockReturnValue({
      loading: false,
      routines: [],
      conversations: [],
      personalState: null,
      failedSections: [],
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/login" element={<p>로그인 화면</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('로그아웃하지 못했어요')
    expect(screen.getByText('우리 가족의 돌봄 기록')).toBeVisible()
    expect(screen.queryByText('로그인 화면')).not.toBeInTheDocument()
  })
})
