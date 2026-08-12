import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TabletStateResponse } from '../api/types'
import { useTabletStatePolling } from '../features/tablet/useTabletStatePolling'
import { useSpeechPlayer } from '../features/tts/useSpeechPlayer'
import { TabletPage } from './TabletPage'

vi.mock('../features/tablet/useTabletStatePolling', () => ({
  useTabletStatePolling: vi.fn(),
}))
vi.mock('../features/tts/useSpeechPlayer', () => ({
  useSpeechPlayer: vi.fn(),
}))

const useTabletState = vi.mocked(useTabletStatePolling)
const useSpeech = vi.mocked(useSpeechPlayer)
const refresh = vi.fn()

const baseState: TabletStateResponse = {
  server_time: '2026-08-13T09:00:00+09:00',
  active_routines: [],
  conversation_suggestion: {
    suggested: false,
    scheduled_time: '14:00:00',
    display_text: null,
    spoken_text: null,
    start_label: null,
  },
  photos: [{
    id: 'photo-1',
    image_base64: 'aGVsbG8=',
    image_media_type: 'image/jpeg',
    location: '서울',
    people: ['가족'],
    event: '생일',
    description: '함께 웃는 가족사진',
  }],
  active_conversation_session_id: null,
}

afterEach(() => vi.clearAllMocks())

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tablet']}>
      <Routes>
        <Route path="/tablet" element={<TabletPage />} />
        <Route path="/conversation" element={<p>대화 화면</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TabletPage', () => {
  beforeEach(() => {
    useSpeech.mockReturnValue({
      status: 'idle',
      play: vi.fn(),
      playAndWait: vi.fn(),
      resume: vi.fn(),
      resumeAndWait: vi.fn(),
      stop: vi.fn(),
    })
  })

  it('gives an active routine priority over a conversation suggestion', () => {
    useTabletState.mockReturnValue({
      status: 'ready',
      data: {
        ...baseState,
        active_routines: [{
          execution_id: 'medication:2026-08-13',
          routine_id: 'medication',
          name: '아침 약',
          category: 'MEDICATION',
          state: 'REMINDING',
          scheduled_at: '2026-08-13T09:00:00+09:00',
          reminder_count: 0,
          display_text: '아침 약 시간입니다.',
          spoken_text: '아침 약 시간입니다.',
          confirm_label: '아침 약 기록하기',
        }],
        conversation_suggestion: {
          suggested: true,
          scheduled_time: '09:00:00',
          display_text: '이야기할 시간이에요.',
          spoken_text: '이야기할 시간이에요.',
          start_label: '대화 시작하기',
        },
      },
      error: null,
      lastUpdatedAt: Date.now(),
      refresh,
    })

    renderPage()

    expect(screen.getByRole('heading', { name: '아침 약 시간입니다.' })).toBeVisible()
    expect(screen.queryByText('이야기할 시간이에요.')).not.toBeInTheDocument()
  })

  it('opens a scheduled conversation when no routine is active', () => {
    useTabletState.mockReturnValue({
      status: 'ready',
      data: {
        ...baseState,
        conversation_suggestion: {
          suggested: true,
          scheduled_time: '14:00:00',
          display_text: '이야기할 시간이에요.',
          spoken_text: '이야기할 시간이에요.',
          start_label: '대화 시작하기',
        },
      },
      error: null,
      lastUpdatedAt: Date.now(),
      refresh,
    })

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '대화 시작하기' }))

    expect(screen.getByText('대화 화면')).toBeVisible()
  })

  it('never renders a retained routine as current while stale', () => {
    useTabletState.mockReturnValue({
      status: 'stale',
      data: {
        ...baseState,
        active_routines: [{
          execution_id: 'stale',
          routine_id: 'stale',
          name: '오래된 약',
          category: 'MEDICATION',
          state: 'REMINDING',
          scheduled_at: '2026-08-13T08:00:00+09:00',
          reminder_count: 0,
          display_text: '오래된 일정',
          spoken_text: '오래된 일정',
          confirm_label: '기록하기',
        }],
      },
      error: 'offline',
      lastUpdatedAt: Date.now(),
      refresh,
    })

    renderPage()

    expect(screen.getByText('최신 상태를 확인할 수 없어요.')).toBeVisible()
    expect(screen.queryByText('오래된 일정')).not.toBeInTheDocument()
  })
})
