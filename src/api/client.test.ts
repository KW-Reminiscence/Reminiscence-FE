import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  ApiProtocolError,
  ApiTimeoutError,
  buildApiUrl,
  completeDemoConversation,
  confirmRoutine,
  getCurrentRoutines,
  getHealth,
  recordDemoConversationTurn,
  recordConversationTurn,
  startDemoConversation,
  startConversation,
  synthesizeDemoSpeech,
  synthesizeSpeech,
} from './client'

afterEach(() => {
  vi.useRealTimers()
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
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/routines/current',
      expect.objectContaining({
        credentials: 'same-origin',
        signal: expect.any(AbortSignal),
      }),
    )
  })

  it('encodes identifiers before mutations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        execution_id: 'morning medication/오늘',
        routine_id: 'morning medication',
        name: '아침 약',
        state: 'CONFIRMED',
        scheduled_at: '2026-07-27T09:00:00+09:00',
        reminder_count: 1,
        confirmed_at: '2026-07-27T09:03:00+09:00',
        confirmation_delay_seconds: 180,
        closed_at: '2026-07-27T09:03:00+09:00',
      }), {
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

  it('notifies the guardian guard when a protected session expires', async () => {
    const listener = vi.fn()
    window.addEventListener('reminiscence:unauthorized', listener)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(import('./client').then(({ getAnomalyState }) => getAnomalyState()))
      .rejects.toBeInstanceOf(ApiError)

    expect(listener).toHaveBeenCalledOnce()
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ role: 'GUARDIAN' })
    window.removeEventListener('reminiscence:unauthorized', listener)
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
          speech_detected: true,
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

    await recordConversationTurn('session-1', wav, 2.5, 'turn-client-1', true)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/conversations/sessions/session-1/turns?turn_duration_seconds=2.5&has_speech=true',
      expect.objectContaining({
        method: 'POST',
        body: wav,
        headers: {
          'Content-Type': 'audio/wav',
          'X-Turn-ID': 'turn-client-1',
        },
      }),
    )
  })

  it('starts a conversation using the backend photo-selection contract', async () => {
    const response = {
      session_id: 'session-1',
      status: 'ACTIVE',
      photo: {
        id: 'photo-1',
        image_base64: 'aGVsbG8=',
        image_media_type: 'image/jpeg',
        location: '서울',
        people: ['어머니'],
        event: '생일',
        description: '생일날 함께 찍은 가족사진',
      },
      question: {
        display_text: '이 사진은 어디에서 찍으셨나요?',
        spoken_text: '이 사진은 어디에서 찍으셨나요?',
      },
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(startConversation('VOLUNTARY')).resolves.toEqual(response)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/conversations/sessions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ source: 'VOLUNTARY' }),
      }),
    )
  })

  it('uses the public demo session routes for the complete conversation lifecycle', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session_id: 'demo-session',
            status: 'ACTIVE',
            photo: {
              id: 'photo-1',
              image_base64: 'aGVsbG8=',
              image_media_type: 'image/jpeg',
              location: '서울',
              people: ['가족'],
              event: '생일',
              description: '가족사진',
            },
            question: { display_text: '첫 질문', spoken_text: '첫 질문' },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            turn_id: 'turn-1',
            utterance_chars: 4,
            turn_duration_seconds: 2.5,
            chars_per_second: 1.6,
            no_response: false,
            speech_detected: true,
            next_question: { display_text: '다음 질문', spoken_text: '다음 질문' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session_id: 'demo-session',
            status: 'COMPLETED',
            started_at: '2026-08-17T14:00:00+09:00',
            completed_at: '2026-08-17T14:01:00+09:00',
            completion_reason: 'USER_FINISHED',
            user_turn_count: 1,
            total_utterance_chars: 4,
            average_utterance_chars: 4,
            average_turn_duration_seconds: 2.5,
            no_response_count: 0,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    const wav = new Blob(['RIFF'], { type: 'audio/wav' })

    await startDemoConversation('VOLUNTARY')
    await recordDemoConversationTurn(
      'demo-session',
      wav,
      2.5,
      'turn-client-1',
      true,
    )
    await completeDemoConversation('demo-session')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/demo/conversations/sessions',
      '/api/v1/demo/conversations/sessions/demo-session/turns?turn_duration_seconds=2.5&has_speech=true',
      '/api/v1/demo/conversations/sessions/demo-session/complete',
    ])
  })

  it('returns TTS responses as audio blobs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('RIFF', {
          status: 200,
          headers: { 'Content-Type': 'audio/wav' },
        }),
      ),
    )

    const audio = await synthesizeSpeech('안녕하세요')

    expect(audio.type).toBe('audio/wav')
    expect(audio.size).toBe(4)
    await expect(audio.text()).resolves.toBe('RIFF')
  })

  it('requests dynamic demo TTS from the public endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('RIFF', {
        status: 200,
        headers: { 'Content-Type': 'audio/wav' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await synthesizeDemoSpeech('가족사진을 보니 어떤 날이 떠오르세요?')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tts/demo-speech',
      expect.objectContaining({
        body: JSON.stringify({ text: '가족사진을 보니 어떤 날이 떠오르세요?' }),
        method: 'POST',
      }),
    )
  })

  it('rejects a successful response with the wrong content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{"status":"ok"}', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )

    await expect(getHealth()).rejects.toBeInstanceOf(ApiProtocolError)
  })

  it('rejects JSON that does not match the OpenAPI response shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ server_time: 'invalid', items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(getCurrentRoutines()).rejects.toBeInstanceOf(ApiProtocolError)
  })

  it('aborts a request after the default timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason)
          })
        }),
      ),
    )

    const rejection = expect(getHealth()).rejects.toBeInstanceOf(ApiTimeoutError)
    await vi.advanceTimersByTimeAsync(15_000)

    await rejection
  })
})
