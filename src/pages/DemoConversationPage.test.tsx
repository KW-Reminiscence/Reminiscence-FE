import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DemoDate } from '../features/routine/useDemoDate'
import { DemoConversationPage } from './DemoConversationPage'

const demoDate: DemoDate = {
  dateLabel: '2026년 8월 17일',
  dateTime: '2026-08-17',
  secondaryDateLabel: '음력 2026년 7월 5일',
}

function renderConversation(initialPath = '/demo/conversation/start') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/demo/conversation/:phase"
          element={<DemoConversationPage demoDate={demoDate} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DemoConversationPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      vi.fn(function SpeechSynthesisUtterance(this: { text: string }, text: string) {
        this.text = text
      }),
    )
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: vi.fn(), speak: vi.fn() },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('starts the demo and advances to the first spoken question', async () => {
    renderConversation()

    fireEvent.click(screen.getByRole('button', { name: '대화 시작하기' }))
    expect(screen.getByText('대화를 준비하고 있어요.')).toBeVisible()

    await act(async () => vi.advanceTimersByTimeAsync(900))

    expect(screen.getByText('가족사진을 보니 어떤 날이 떠오르세요?')).toBeVisible()
    expect(window.speechSynthesis.speak).toHaveBeenCalledOnce()
  })

  it('moves through both answers and completes without an API or microphone', async () => {
    renderConversation('/demo/conversation/active')

    fireEvent.click(screen.getByRole('button', { name: '답변 마쳤어요' }))
    expect(screen.getByText('말씀을 잘 들었어요.')).toBeVisible()

    await act(async () => vi.advanceTimersByTimeAsync(1_000))
    expect(
      screen.getByText('그날 가장 기억에 남는 이야기를 들려주세요.'),
    ).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '답변 마쳤어요' }))
    expect(screen.getByText('오늘 대화를 마쳤어요.')).toBeVisible()
  })

  it('allows the demo to end early', () => {
    renderConversation('/demo/conversation/active')

    fireEvent.click(screen.getByRole('button', { name: '대화 끝내기' }))

    expect(screen.getByText('오늘 대화를 마쳤어요.')).toBeVisible()
  })
})
