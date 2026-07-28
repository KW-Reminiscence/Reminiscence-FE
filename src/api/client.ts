import type {
  ConversationSource,
  ConversationSuggestion,
  ConversationSummary,
  ConversationTurnResponse,
  CurrentRoutinesResponse,
  HealthResponse,
  PersonalState,
  RoutineExecution,
  StartConversationRequest,
  StartConversationResponse,
} from './types'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(errorMessage(status, detail))
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

function errorMessage(status: number, detail: unknown) {
  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }
  return `API request failed with status ${status}`
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export function buildApiUrl(path: string, baseUrl = configuredBaseUrl) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimTrailingSlash(baseUrl)}${normalizedPath}`
}

async function parseError(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as { detail?: unknown }
    return payload.detail ?? payload
  }

  const body = await response.text()
  return body || response.statusText
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init)

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response))
  }

  return response.json() as Promise<T>
}

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const response = await fetch(buildApiUrl(path), init)

  if (!response.ok) {
    throw new ApiError(response.status, await parseError(response))
  }

  return response.blob()
}

function jsonRequest(method: 'POST', body?: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    signal,
  }
}

export function getHealth(signal?: AbortSignal) {
  return requestJson<HealthResponse>('/health', { signal })
}

export function getCurrentRoutines(signal?: AbortSignal) {
  return requestJson<CurrentRoutinesResponse>('/api/v1/routines/current', { signal })
}

export function confirmRoutine(executionId: string, signal?: AbortSignal) {
  return requestJson<RoutineExecution>(
    `/api/v1/routines/${encodeURIComponent(executionId)}/confirm`,
    jsonRequest('POST', undefined, signal),
  )
}

export function getRoutineHistory(signal?: AbortSignal) {
  return requestJson<RoutineExecution[]>('/api/v1/routines/history', { signal })
}

export function getConversationSuggestion(signal?: AbortSignal) {
  return requestJson<ConversationSuggestion>('/api/v1/conversations/suggestion', {
    signal,
  })
}

export function startConversation(
  source: ConversationSource,
  options: { photoId?: string; signal?: AbortSignal } = {},
) {
  const payload: StartConversationRequest = {
    source,
    ...(options.photoId ? { photo_id: options.photoId } : {}),
  }
  return requestJson<StartConversationResponse>(
    '/api/v1/conversations/sessions',
    jsonRequest('POST', payload, options.signal),
  )
}

export function recordConversationTurn(
  sessionId: string,
  wav: Blob,
  durationSeconds: number,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    turn_duration_seconds: String(durationSeconds),
  })

  return requestJson<ConversationTurnResponse>(
    `/api/v1/conversations/sessions/${encodeURIComponent(sessionId)}/turns?${query}`,
    {
      method: 'POST',
      body: wav,
      headers: { 'Content-Type': 'audio/wav' },
      signal,
    },
  )
}

export function completeConversation(sessionId: string, signal?: AbortSignal) {
  return requestJson<ConversationSummary>(
    `/api/v1/conversations/sessions/${encodeURIComponent(sessionId)}/complete`,
    jsonRequest('POST', undefined, signal),
  )
}

export function getConversationHistory(signal?: AbortSignal) {
  return requestJson<ConversationSummary[]>('/api/v1/conversations/sessions', {
    signal,
  })
}

export function getAnomalyState(signal?: AbortSignal) {
  return requestJson<PersonalState>('/api/v1/anomaly/state', { signal })
}

export function synthesizeSpeech(text: string, signal?: AbortSignal) {
  return requestBlob(
    '/api/v1/tts/speech',
    jsonRequest('POST', { text }, signal),
  )
}
