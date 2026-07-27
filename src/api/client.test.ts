import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  buildApiUrl,
  confirmRoutine,
  getCurrentRoutines,
  recordConversationTurn,
  synthesizeSpeech,
} from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('API client', () => {
  it('normalizes base URLs and relative paths', () => {
    expect(buildApiUrl('/health', 'http://127.0.0.1:8000/')).toBe(
      'http://127.0.0.1:8000/health',
    )
    expect(buildApiUrl('health', '')).toBe('/health')
  })

  it('returns typed JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          server_time: '2026-07-27T09:00:00+09:00',
          items: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCurrentRoutines()).resolves.toEqual({
      server_time: '2026-07-27T09:00:00+09:00',
      items: [],
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/routines/current', {
      signal: undefined,
    })
  })

  it('encodes identifiers before mutations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ state: 'CONFIRMED' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await confirmRoutine('morning medication/오늘')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/routines/morning%20medication%2F%EC%98%A4%EB%8A%98/confirm',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('preserves backend error details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'routine is already closed' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    const error = await confirmRoutine('closed').catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 409,
      detail: 'routine is already closed',
      message: 'routine is already closed',
    })
  })

  it('uploads raw WAV with a finite duration query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          turn_id: 'turn-1',
          utterance_chars: 4,
          turn_duration_seconds: 2.5,
          chars_per_second: 1.6,
          no_response: false,
          next_question: {
            display_text: '다음 질문',
            spoken_text: '다음 질문',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const wav = new Blob(['RIFF'], { type: 'audio/wav' })

    await recordConversationTurn('session-1', wav, 2.5)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/conversations/sessions/session-1/turns?turn_duration_seconds=2.5',
      expect.objectContaining({
        method: 'POST',
        body: wav,
        headers: { 'Content-Type': 'audio/wav' },
      }),
    )
  })

  it('returns TTS responses as audio blobs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Blob(['RIFF'], { type: 'audio/wav' }), {
          status: 200,
          headers: { 'Content-Type': 'audio/wav' },
        }),
      ),
    )

    const audio = await synthesizeSpeech('안녕하세요')

    expect(audio).toBeInstanceOf(Blob)
    expect(audio.type).toBe('audio/wav')
  })
})
