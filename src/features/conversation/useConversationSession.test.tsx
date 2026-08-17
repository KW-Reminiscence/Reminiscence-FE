import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/client'
import { useSpeechPlayer } from '../tts/useSpeechPlayer'
import {
  demoConversationApi,
  useConversationSession,
} from './useConversationSession'

const recorder = vi.hoisted(() => ({
  cancel: vi.fn().mockResolvedValue(undefined),
  onComplete: null as null | ((turn: {
    wav: Blob
    durationSeconds: number
    hasSpeech: boolean
    endReason: 'manual'
  }) => Promise<void>),
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  completeDemoConversation: vi.fn(),
  completeConversation: vi.fn(),
  getTabletState: vi.fn(),
  recordDemoConversationTurn: vi.fn(),
  startDemoConversation: vi.fn(),
  synthesizeDemoSpeech: vi.fn(),
}))
vi.mock('../tts/useSpeechPlayer', () => ({
  useSpeechPlayer: vi.fn(),
}))
vi.mock('./pcmTurnRecorder', () => ({
  PcmTurnRecorder: vi.fn(function PcmTurnRecorder(options: {
    onComplete: typeof recorder.onComplete
  }) {
    recorder.onComplete = options.onComplete
    return {
      cancel: recorder.cancel,
      start: recorder.start,
      stop: recorder.stop,
    }
  }),
}))

const completeDemo = vi.mocked(api.completeDemoConversation)
const complete = vi.mocked(api.completeConversation)
const getTabletState = vi.mocked(api.getTabletState)
const recordDemo = vi.mocked(api.recordDemoConversationTurn)
const startDemo = vi.mocked(api.startDemoConversation)
const useSpeech = vi.mocked(useSpeechPlayer)

afterEach(() => vi.clearAllMocks())

beforeEach(() => {
  recorder.onComplete = null
  recorder.cancel.mockClear()
  recorder.start.mockClear().mockResolvedValue(undefined)
  recorder.stop.mockClear().mockResolvedValue(undefined)
})

describe('useConversationSession entry', () => {
  it('closes an interrupted active session before enabling start', async () => {
    useSpeech.mockReturnValue({
      status: 'idle',
      play: vi.fn(),
      playAndWait: vi.fn(),
      resume: vi.fn(),
      resumeAndWait: vi.fn(),
      stop: vi.fn(),
    })
    getTabletState.mockResolvedValue({
      server_time: '2026-08-13T09:00:00+09:00',
      active_routines: [],
      conversation_suggestion: {
        suggested: false,
        scheduled_time: '14:00:00',
        display_text: null,
        spoken_text: null,
        start_label: null,
      },
      photos: [],
      active_conversation_session_id: 'session-interrupted',
    })
    complete.mockResolvedValue({
      session_id: 'session-interrupted',
      status: 'COMPLETED',
      started_at: '2026-08-13T08:00:00+09:00',
      completed_at: '2026-08-13T09:00:00+09:00',
      completion_reason: 'NAVIGATION',
      user_turn_count: 0,
      total_utterance_chars: 0,
      average_utterance_chars: null,
      average_turn_duration_seconds: null,
      no_response_count: 0,
    })

    const { result } = renderHook(() => useConversationSession())

    await waitFor(() => expect(result.current.phase).toBe('ready'))
    expect(complete).toHaveBeenCalledWith(
      'session-interrupted',
      'NAVIGATION',
      expect.any(AbortSignal),
    )
  })

  it('runs demo audio through STT and LLM before speaking the next question', async () => {
    const playAndWait = vi.fn().mockResolvedValue('ended')
    useSpeech.mockReturnValue({
      status: 'idle',
      play: vi.fn(),
      playAndWait,
      resume: vi.fn(),
      resumeAndWait: vi.fn(),
      stop: vi.fn(),
    })
    startDemo.mockResolvedValue({
      session_id: 'demo-session',
      status: 'ACTIVE',
      photo: {
        id: 'family-1',
        image_base64: 'aW1hZ2U=',
        image_media_type: 'image/png',
        location: '제주도',
        people: ['가족'],
        event: '가족여행',
        description: '함께 찍은 사진',
      },
      question: {
        display_text: '이 사진은 언제 찍으셨나요?',
        spoken_text: '이 사진은 언제 찍으셨나요?',
      },
    })
    recordDemo.mockResolvedValue({
      turn_id: 'turn-1',
      utterance_chars: 12,
      turn_duration_seconds: 4.2,
      chars_per_second: 2.857,
      no_response: false,
      speech_detected: true,
      next_question: {
        display_text: '그날 누구와 함께 계셨나요?',
        spoken_text: '그날 누구와 함께 계셨나요?',
      },
    })
    completeDemo.mockResolvedValue({
      session_id: 'demo-session',
      status: 'COMPLETED',
      started_at: '2026-08-17T14:00:00+09:00',
      completed_at: '2026-08-17T14:01:00+09:00',
      completion_reason: 'USER_FINISHED',
      user_turn_count: 2,
      total_utterance_chars: 24,
      average_utterance_chars: 12,
      average_turn_duration_seconds: 4.2,
      no_response_count: 0,
    })

    const { result } = renderHook(() =>
      useConversationSession(demoConversationApi),
    )
    await waitFor(() => expect(result.current.phase).toBe('ready'))

    await act(async () => result.current.start())

    expect(startDemo).toHaveBeenCalledWith('VOLUNTARY', {
      signal: expect.any(AbortSignal),
    })
    expect(useSpeech).toHaveBeenCalledWith(api.synthesizeDemoSpeech)
    expect(playAndWait).toHaveBeenCalledWith(
      '이 사진은 언제 찍으셨나요?',
      'demo-session:question:0',
      false,
    )
    expect(recorder.start).toHaveBeenCalledOnce()

    const firstTurn = {
      wav: new Blob(['RIFF-first'], { type: 'audio/wav' }),
      durationSeconds: 4.2,
      hasSpeech: true,
      endReason: 'manual' as const,
    }
    await act(async () => recorder.onComplete?.(firstTurn))

    expect(recordDemo).toHaveBeenCalledWith(
      'demo-session',
      firstTurn.wav,
      4.2,
      expect.any(String),
      true,
      expect.any(AbortSignal),
    )
    expect(playAndWait).toHaveBeenLastCalledWith(
      '그날 누구와 함께 계셨나요?',
      'demo-session:question:1',
      false,
    )
    expect(recorder.start).toHaveBeenCalledTimes(2)
    expect(result.current.phase).toBe('listening')

    const secondTurn = {
      wav: new Blob(['RIFF-second'], { type: 'audio/wav' }),
      durationSeconds: 4.2,
      hasSpeech: true,
      endReason: 'manual' as const,
    }
    recorder.stop.mockImplementationOnce(async () => {
      await recorder.onComplete?.(secondTurn)
    })
    await act(async () => result.current.finish())

    await waitFor(() => expect(result.current.phase).toBe('completed'))
    expect(recordDemo).toHaveBeenCalledTimes(2)
    expect(completeDemo).toHaveBeenCalledWith(
      'demo-session',
      'USER_FINISHED',
      expect.any(AbortSignal),
    )
  })
})
