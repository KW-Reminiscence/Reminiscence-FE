import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  demoConversationApi,
  useConversationSession,
} from '../features/conversation/useConversationSession'
import type { DemoDate } from '../features/routine/useDemoDate'
import { DemoConversationPage } from './DemoConversationPage'

vi.mock('../features/conversation/useConversationSession', () => ({
  demoConversationApi: { kind: 'demo' },
  tabletConversationApi: { kind: 'tablet' },
  useConversationSession: vi.fn(),
}))

const useConversation = vi.mocked(useConversationSession)
const demoDate: DemoDate = {
  dateLabel: '2026년 8월 17일',
  dateTime: '2026-08-17',
  secondaryDateLabel: '음력 2026년 7월 5일',
}

afterEach(() => vi.clearAllMocks())

describe('DemoConversationPage', () => {
  it('renders the shared conversation experience with the demo API', () => {
    useConversation.mockReturnValue({
      phase: 'ready',
      suggestion: {
        suggested: false,
        scheduled_time: '14:00:00',
        display_text: '저랑 대화하실래요?',
        spoken_text: null,
        start_label: '대화 시작하기',
      },
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
      <MemoryRouter initialEntries={['/demo/conversation/start']}>
        <DemoConversationPage demoDate={demoDate} />
      </MemoryRouter>,
    )

    expect(useConversation).toHaveBeenCalledWith(demoConversationApi)
    expect(screen.getByText('2026년 8월 17일')).toBeVisible()
    expect(screen.getByText('음력 2026년 7월 5일')).toBeVisible()
    expect(screen.getByRole('button', { name: '대화 시작하기' })).toBeVisible()
  })
})
