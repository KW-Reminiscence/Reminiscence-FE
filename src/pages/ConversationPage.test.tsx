import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useConversationSession } from '../features/conversation/useConversationSession'
import { ConversationPage } from './ConversationPage'

vi.mock('../features/conversation/useConversationSession', () => ({
  useConversationSession: vi.fn(),
}))

const useConversation = vi.mocked(useConversationSession)

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('ConversationPage', () => {
  it('returns to the family photo home after completion', async () => {
    vi.useFakeTimers()
    useConversation.mockReturnValue({
      phase: 'completed',
      suggestion: null,
      question: null,
      photo: null,
      progress: null,
      error: null,
      start: vi.fn(),
      finishTurn: vi.fn(),
      finish: vi.fn(),
      retry: vi.fn(),
      restart: vi.fn(),
    })
    render(
      <MemoryRouter initialEntries={['/conversation']}>
        <Routes>
          <Route path="/" element={<p>가족사진 홈</p>} />
          <Route path="/conversation" element={<ConversationPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('오늘 대화를 기록했어요.')).toBeVisible()
    await act(async () => vi.advanceTimersByTimeAsync(2_000))

    expect(screen.getByText('가족사진 홈')).toBeVisible()
  })
})
