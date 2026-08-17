import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DemoDate } from '../features/routine/useDemoDate'
import { DemoConversationPage } from './DemoConversationPage'

const recorder = vi.hoisted(() => ({
  cancel: vi.fn().mockResolvedValue(undefined),
  onComplete: null as null | (() => void),
  onProgress: null as null | ((progress: unknown) => void),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
}))

vi.mock('../features/conversation/pcmTurnRecorder', () => ({
  PcmRecorderInitializationError: class PcmRecorderInitializationError extends Error {},
  PcmTurnRecorder: vi.fn(function PcmTurnRecorder(options: {
    onComplete: () => void
    onProgress: (progress: unknown) => void
  }) {
    recorder.onComplete = options.onComplete
    recorder.onProgress = options.onProgress
    return {
      cancel: recorder.cancel,
      start: recorder.start,
      stop: recorder.stop,
    }
  }),
}))

const demoDate: DemoDate = {
  dateLabel: '2026년 8월 17일',
  dateTime: '2026-08-17',
  secondaryDateLabel: '음력 2026년 7월 5일',
}

interface FakeUtterance {
  onend: (() => void) | null
  onerror: (() => void) | null
  text: string
}

const utterances: FakeUtterance[] = []

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

async function finishQuestionSpeech(index: number) {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
  expect(utterances[index]).toBeDefined()
  await act(async () => {
    utterances[index].onend?.()
    await Promise.resolve()
  })
}

describe('DemoConversationPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    utterances.length = 0
    recorder.onComplete = null
    recorder.onProgress = null
    recorder.cancel.mockClear()
    recorder.start.mockClear().mockResolvedValue(undefined)
    recorder.stop.mockReset().mockImplementation(async () => {
      recorder.onComplete?.()
    })
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      vi.fn(function SpeechSynthesisUtterance(this: FakeUtterance, text: string) {
        this.text = text
        this.onend = null
        this.onerror = null
      }),
    )
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: vi.fn(),
        speak: vi.fn((utterance: FakeUtterance) => utterances.push(utterance)),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('starts recording only after the first question finishes playing', async () => {
    renderConversation()

    fireEvent.click(screen.getByRole('button', { name: '대화 시작하기' }))
    expect(screen.getByText('대화를 준비하고 있어요.')).toBeVisible()

    await act(async () => vi.advanceTimersByTimeAsync(900))
    expect(screen.getByText('질문이 끝나면 말씀해주세요.')).toBeVisible()
    expect(recorder.start).not.toHaveBeenCalled()

    await finishQuestionSpeech(0)

    expect(recorder.start).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '답변 마쳤어요' })).toBeVisible()
    expect(screen.getByText('말씀을 시작해주세요. 15초 동안 기다릴게요.')).toBeVisible()
  })

  it('uses the same recorder to move through both turns and complete', async () => {
    renderConversation('/demo/conversation/active')
    await finishQuestionSpeech(0)

    fireEvent.click(screen.getByRole('button', { name: '답변 마쳤어요' }))
    expect(recorder.stop).toHaveBeenCalledOnce()
    expect(screen.getByText('말씀을 잘 들었어요.')).toBeVisible()

    await act(async () => vi.advanceTimersByTimeAsync(1_000))
    expect(
      screen.getByText('그날 가장 기억에 남는 이야기를 들려주세요.'),
    ).toBeVisible()
    await finishQuestionSpeech(1)

    fireEvent.click(screen.getByRole('button', { name: '답변 마쳤어요' }))
    await act(async () => vi.advanceTimersByTimeAsync(1_000))

    expect(screen.getByText('오늘 대화를 마쳤어요.')).toBeVisible()
  })

  it('shows a retryable microphone error instead of continuing without recording', async () => {
    recorder.start.mockRejectedValueOnce(
      new DOMException('permission denied', 'NotAllowedError'),
    )
    renderConversation('/demo/conversation/active')

    await finishQuestionSpeech(0)

    expect(screen.getByText('마이크 연결을 확인해주세요.')).toBeVisible()
    expect(
      screen.getByText('마이크를 연결하지 못했어요. 브라우저의 마이크 권한을 확인해주세요.'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '마이크 다시 연결' })).toBeVisible()
  })

  it('allows the demo to end early and releases the recorder', async () => {
    renderConversation('/demo/conversation/active')
    await finishQuestionSpeech(0)

    fireEvent.click(screen.getByRole('button', { name: '대화 끝내기' }))
    await act(async () => Promise.resolve())

    expect(recorder.cancel).toHaveBeenCalled()
    expect(screen.getByText('오늘 대화를 마쳤어요.')).toBeVisible()
  })
})
