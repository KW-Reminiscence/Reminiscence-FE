import type { z } from 'zod'
import { apiSchemas } from './schemas'
import type {
  ConversationSource,
  ConversationCompletionReason,
  ConversationSuggestion,
  ConversationSummary,
  ConversationTurnResponse,
  CurrentRoutinesResponse,
  HealthResponse,
  SessionResponse,
  PersonalState,
  RoutineExecution,
  StartConversationRequest,
  StartConversationResponse,
  TabletStateResponse,
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

export class ApiProtocolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiProtocolError'
  }
}

export class ApiTimeoutError extends Error {
  constructor() {
    super('API request timed out')
    this.name = 'ApiTimeoutError'
  }
}

const DEFAULT_TIMEOUT_MS = 15_000
export const AUTH_UNAUTHORIZED_EVENT = 'reminiscence:unauthorized'

function unauthorizedRole(path: string, init?: RequestInit) {
  if (
    path.startsWith('/api/v1/anomaly') ||
    path === '/api/v1/routines/history' ||
    (path === '/api/v1/conversations/sessions' && !init?.method) ||
    path.startsWith('/api/v1/auth/guardian')
  ) {
    return 'GUARDIAN' as const
  }
  return 'TABLET' as const
}

function notifyUnauthorized(path: string, init?: RequestInit) {
  window.dispatchEvent(
    new CustomEvent(AUTH_UNAUTHORIZED_EVENT, {
      detail: { role: unauthorizedRole(path, init) },
    }),
  )
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

function requestOptions(init: RequestInit | undefined, timeoutMs: number) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => {
    controller.abort(new ApiTimeoutError())
  }, timeoutMs)
  const sourceSignal = init?.signal
  const handleAbort = () => controller.abort(sourceSignal?.reason)
  sourceSignal?.addEventListener('abort', handleAbort, { once: true })

  return {
    init: {
      ...init,
      credentials: 'same-origin' as const,
      signal: controller.signal,
    },
    cleanup() {
      window.clearTimeout(timeout)
      sourceSignal?.removeEventListener('abort', handleAbort)
    },
  }
}

async function fetchWithPolicy(path: string, init?: RequestInit) {
  const request = requestOptions(init, DEFAULT_TIMEOUT_MS)
  try {
    return await fetch(buildApiUrl(path), request.init)
  } catch (cause) {
    if (request.init.signal.reason instanceof ApiTimeoutError) {
      throw request.init.signal.reason
    }
    throw cause
  } finally {
    request.cleanup()
  }
}

async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchWithPolicy(path, init)

  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized(path, init)
    throw new ApiError(response.status, await parseError(response))
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiProtocolError('API response is not JSON')
  }

  const payload: unknown = await response.json()
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiProtocolError('API response does not match the contract')
  }
  return parsed.data
}

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const response = await fetchWithPolicy(path, init)

  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized(path, init)
    throw new ApiError(response.status, await parseError(response))
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('audio/')) {
    throw new ApiProtocolError('API response is not audio')
  }
  return response.blob()
}

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
  const response = await fetchWithPolicy(path, init)
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized(path, init)
    throw new ApiError(response.status, await parseError(response))
  }
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
  return requestJson<HealthResponse>('/api/health/live', apiSchemas.health, { signal })
}

export function guardianLogin(password: string, signal?: AbortSignal) {
  return requestJson<SessionResponse>(
    '/api/v1/auth/guardian/login',
    apiSchemas.session,
    jsonRequest('POST', { password }, signal),
  )
}

export function getGuardianSession(signal?: AbortSignal) {
  return requestJson<SessionResponse>(
    '/api/v1/auth/guardian/session',
    apiSchemas.session,
    { signal },
  )
}

export function guardianLogout(signal?: AbortSignal) {
  return requestVoid(
    '/api/v1/auth/guardian/logout',
    jsonRequest('POST', undefined, signal),
  )
}

export function pairTablet(pairingCode: string, signal?: AbortSignal) {
  return requestJson<SessionResponse>(
    '/api/v1/auth/tablet/pair',
    apiSchemas.session,
    jsonRequest('POST', { pairing_code: pairingCode }, signal),
  )
}

export function getTabletSession(signal?: AbortSignal) {
  return requestJson<SessionResponse>(
    '/api/v1/auth/tablet/session',
    apiSchemas.session,
    { signal },
  )
}

export function tabletLogout(signal?: AbortSignal) {
  return requestVoid(
    '/api/v1/auth/tablet/logout',
    jsonRequest('POST', undefined, signal),
  )
}

export function getTabletState(signal?: AbortSignal) {
  return requestJson<TabletStateResponse>(
    '/api/v1/tablet/state',
    apiSchemas.tabletState,
    { signal },
  )
}

export function getCurrentRoutines(signal?: AbortSignal) {
  return requestJson<CurrentRoutinesResponse>(
    '/api/v1/routines/current',
    apiSchemas.currentRoutines,
    { signal },
  )
}

export function confirmRoutine(executionId: string, signal?: AbortSignal) {
  return requestJson<RoutineExecution>(
    `/api/v1/routines/${encodeURIComponent(executionId)}/confirm`,
    apiSchemas.routineExecution,
    jsonRequest('POST', undefined, signal),
  )
}

export function getRoutineHistory(signal?: AbortSignal) {
  return requestJson<RoutineExecution[]>(
    '/api/v1/routines/history',
    apiSchemas.routineHistory,
    { signal },
  )
}

export function getConversationSuggestion(signal?: AbortSignal) {
  return requestJson<ConversationSuggestion>(
    '/api/v1/conversations/suggestion',
    apiSchemas.conversationSuggestion,
    { signal },
  )
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
    apiSchemas.startConversation,
    jsonRequest('POST', payload, options.signal),
  )
}

export function recordConversationTurn(
  sessionId: string,
  wav: Blob,
  durationSeconds: number,
  turnId: string,
  hasSpeech: boolean,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    turn_duration_seconds: String(durationSeconds),
    has_speech: String(hasSpeech),
  })

  return requestJson<ConversationTurnResponse>(
    `/api/v1/conversations/sessions/${encodeURIComponent(sessionId)}/turns?${query}`,
    apiSchemas.conversationTurn,
    {
      method: 'POST',
      body: wav,
      headers: {
        'Content-Type': 'audio/wav',
        'X-Turn-ID': turnId,
      },
      signal,
    },
  )
}

export function completeConversation(
  sessionId: string,
  reason: ConversationCompletionReason = 'USER_FINISHED',
  signal?: AbortSignal,
) {
  return requestJson<ConversationSummary>(
    `/api/v1/conversations/sessions/${encodeURIComponent(sessionId)}/complete`,
    apiSchemas.conversationSummary,
    jsonRequest('POST', { reason }, signal),
  )
}

export function getConversationHistory(signal?: AbortSignal) {
  return requestJson<ConversationSummary[]>(
    '/api/v1/conversations/sessions',
    apiSchemas.conversationHistory,
    { signal },
  )
}

export function getAnomalyState(signal?: AbortSignal) {
  return requestJson<PersonalState>('/api/v1/anomaly/state', apiSchemas.personalState, {
    signal,
  })
}

export function synthesizeSpeech(text: string, signal?: AbortSignal) {
  return requestBlob(
    '/api/v1/tts/speech',
    jsonRequest('POST', { text }, signal),
  )
}

export function synthesizeDemoSpeech(text: string, signal?: AbortSignal) {
  return requestBlob(
    '/api/v1/tts/demo-speech',
    jsonRequest('POST', { text }, signal),
  )
}
