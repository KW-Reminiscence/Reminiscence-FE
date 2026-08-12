import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../api/client'
import { useSpeechPlayer } from '../tts/useSpeechPlayer'
import { useConversationSession } from './useConversationSession'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  completeConversation: vi.fn(),
  getTabletState: vi.fn(),
}))
vi.mock('../tts/useSpeechPlayer', () => ({
  useSpeechPlayer: vi.fn(),
}))

const complete = vi.mocked(api.completeConversation)
const getTabletState = vi.mocked(api.getTabletState)
const useSpeech = vi.mocked(useSpeechPlayer)

afterEach(() => vi.clearAllMocks())

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
})
