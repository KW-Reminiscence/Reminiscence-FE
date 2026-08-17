import { useCallback, useEffect, useRef, useState } from 'react'
import {
  completeDemoConversation,
  completeConversation,
  getTabletState,
  recordDemoConversationTurn,
  recordConversationTurn,
  startDemoConversation,
  startConversation,
  synthesizeDemoSpeech,
  synthesizeSpeech,
} from '../../api/client'
import type {
  ConversationSuggestion,
  PhotoMemory,
  SpeechText,
} from '../../api/types'
import { useSpeechPlayer } from '../tts/useSpeechPlayer'
import {
  PcmTurnRecorder,
  type CapturedTurn,
} from './pcmTurnRecorder'
import type { TurnProgress } from './turnDetector'
import { ConversationCompletionGate } from './completionGate'
import { microphoneErrorMessage } from './microphoneError'

export type ConversationPhase =
  | 'loading'
  | 'ready'
  | 'starting'
  | 'asking'
  | 'audio-blocked'
  | 'listening'
  | 'silence'
  | 'microphone-error'
  | 'uploading'
  | 'completing'
  | 'completed'
  | 'error'

interface ConversationState {
  phase: ConversationPhase
  suggestion: ConversationSuggestion | null
  question: SpeechText | null
  photo: PhotoMemory | null
  progress: TurnProgress | null
  error: string | null
}

const initialState: ConversationState = {
  phase: 'loading',
  suggestion: null,
  question: null,
  photo: null,
  progress: null,
  error: null,
}

interface ConversationEntryState {
  activeSessionId: string | null
  suggestion: ConversationSuggestion
}

export interface ConversationSessionApi {
  complete: typeof completeConversation
  loadEntry: (signal: AbortSignal) => Promise<ConversationEntryState>
  recordTurn: typeof recordConversationTurn
  start: typeof startConversation
  synthesize: typeof synthesizeSpeech
}

async function loadTabletConversationEntry(
  signal: AbortSignal,
): Promise<ConversationEntryState> {
  const tabletState = await getTabletState(signal)
  return {
    activeSessionId: tabletState.active_conversation_session_id,
    suggestion: tabletState.conversation_suggestion,
  }
}

async function loadDemoConversationEntry(): Promise<ConversationEntryState> {
  return {
    activeSessionId: null,
    suggestion: {
      suggested: false,
      scheduled_time: '14:00:00',
      display_text: '저랑 대화하실래요?',
      spoken_text: null,
      start_label: '대화 시작하기',
    },
  }
}

export const tabletConversationApi: ConversationSessionApi = {
  complete: completeConversation,
  loadEntry: loadTabletConversationEntry,
  recordTurn: recordConversationTurn,
  start: startConversation,
  synthesize: synthesizeSpeech,
}

export const demoConversationApi: ConversationSessionApi = {
  complete: completeDemoConversation,
  loadEntry: loadDemoConversationEntry,
  recordTurn: recordDemoConversationTurn,
  start: startDemoConversation,
  synthesize: synthesizeDemoSpeech,
}

export function useConversationSession(
  api: ConversationSessionApi = tabletConversationApi,
) {
  const [state, setState] = useState<ConversationState>(initialState)
  const { playAndWait, stop: stopSpeech } = useSpeechPlayer(api.synthesize)
  const sessionIdRef = useRef<string | null>(null)
  const questionNumberRef = useRef(0)
  const recorderRef = useRef<PcmTurnRecorder | null>(null)
  const finishRequestedRef = useRef(false)
  const completionGateRef = useRef(new ConversationCompletionGate())
  const mountedRef = useRef(true)
  const abortRef = useRef(new AbortController())
  const retryRef = useRef<(() => void) | null>(null)
  const processQuestionRef = useRef<
    ((question: SpeechText, force?: boolean) => Promise<void>) | null
  >(null)
  const startRecorderRef = useRef<(() => Promise<void>) | null>(null)
  const handleCapturedTurnRef = useRef<
    ((turn: CapturedTurn) => Promise<void>) | null
  >(null)

  const updatePhase = useCallback(
    (phase: ConversationPhase, changes: Partial<ConversationState> = {}) => {
      if (!mountedRef.current) return
      setState((current) => ({
        ...current,
        ...changes,
        phase,
      }))
    },
    [],
  )

  const finalize = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    updatePhase('completing', { error: null, progress: null })
    try {
      await completionGateRef.current.run(() =>
        api.complete(sessionId, 'USER_FINISHED', abortRef.current.signal),
      )
      updatePhase('completed')
      retryRef.current = null
    } catch {
      retryRef.current = () => {
        void finalize()
      }
      updatePhase('error', {
        error: '대화 종료 기록을 저장하지 못했어요. 다시 시도해주세요.',
      })
    }
  }, [api, updatePhase])

  const handleCapturedTurn = useCallback(
    async (turn: CapturedTurn, turnId = crypto.randomUUID()) => {
      recorderRef.current = null
      const sessionId = sessionIdRef.current
      if (!sessionId) return

      completionGateRef.current.beginUpload()
      updatePhase('uploading', { error: null, progress: null })
      try {
        const response = await api.recordTurn(
          sessionId,
          turn.wav,
          Number(turn.durationSeconds.toFixed(3)),
          turnId,
          turn.hasSpeech,
          abortRef.current.signal,
        )

        if (completionGateRef.current.endUpload()) {
          await finalize()
          return
        }

        questionNumberRef.current += 1
        updatePhase('asking', { question: response.next_question })
        await processQuestionRef.current?.(response.next_question)
      } catch {
        if (completionGateRef.current.endUpload()) {
          await finalize()
          return
        }
        retryRef.current = () => {
          void handleCapturedTurn(turn, turnId)
        }
        updatePhase('error', {
          error: '말씀하신 내용을 저장하지 못했어요. 다시 시도해주세요.',
        })
      }
    },
    [api, finalize, updatePhase],
  )
  handleCapturedTurnRef.current = handleCapturedTurn

  const startRecorder = useCallback(async () => {
    updatePhase('listening', { error: null, progress: null })

    const recorder = new PcmTurnRecorder({
      onProgress(progress) {
        updatePhase(progress.phase === 'silence' ? 'silence' : 'listening', {
          progress,
        })
      },
      async onComplete(turn) {
        await handleCapturedTurnRef.current?.(turn)
      },
    })
    recorderRef.current = recorder

    try {
      await recorder.start()
      retryRef.current = null
    } catch (error) {
      recorderRef.current = null
      retryRef.current = () => {
        void startRecorder()
      }
      updatePhase('microphone-error', {
        error: microphoneErrorMessage(error),
      })
    }
  }, [updatePhase])
  startRecorderRef.current = startRecorder

  const processQuestion = useCallback(
    async (question: SpeechText, force = false) => {
      const sessionId = sessionIdRef.current
      if (!sessionId) return

      updatePhase('asking', { error: null, question, progress: null })
      const result = await playAndWait(
        question.spoken_text,
        `${sessionId}:question:${questionNumberRef.current}`,
        force,
      )

      if (finishRequestedRef.current) return

      if (result === 'ended') {
        await startRecorderRef.current?.()
        return
      }

      if (result === 'blocked') {
        retryRef.current = () => {
          void processQuestion(question, true)
        }
        updatePhase('audio-blocked', {
          error: '질문을 재생하려면 아래 버튼을 한 번 눌러주세요.',
        })
        return
      }

      retryRef.current = () => {
        void processQuestion(question, true)
      }
      updatePhase('error', {
        error: '질문 음성을 재생하지 못했어요. 다시 시도해주세요.',
      })
    },
    [playAndWait, updatePhase],
  )
  processQuestionRef.current = processQuestion

  const start = useCallback(async () => {
    if (!state.suggestion || sessionIdRef.current) return

    updatePhase('starting', { error: null })
    finishRequestedRef.current = false
    questionNumberRef.current = 0

    try {
      const response = await api.start(
        state.suggestion.suggested ? 'SCHEDULED' : 'VOLUNTARY',
        { signal: abortRef.current.signal },
      )
      sessionIdRef.current = response.session_id
      updatePhase('asking', {
        question: response.question,
        photo: response.photo,
      })
      await processQuestion(response.question)
    } catch {
      retryRef.current = () => {
        void start()
      }
      updatePhase('error', {
        error: '대화를 시작하지 못했어요. 연결을 확인하고 다시 시도해주세요.',
      })
    }
  }, [api, processQuestion, state.suggestion, updatePhase])

  const finish = useCallback(async () => {
    if (!sessionIdRef.current) return
    finishRequestedRef.current = true
    stopSpeech()
    updatePhase('completing', { error: null })
    const canFinalize = completionGateRef.current.requestFinish()

    if (recorderRef.current) {
      await recorderRef.current.stop()
      return
    }
    if (canFinalize) await finalize()
  }, [finalize, stopSpeech, updatePhase])

  const finishTurn = useCallback(async () => {
    await recorderRef.current?.stop()
  }, [])

  const retry = useCallback(() => {
    retryRef.current?.()
  }, [])

  const restart = useCallback(() => {
    sessionIdRef.current = null
    questionNumberRef.current = 0
    finishRequestedRef.current = false
    completionGateRef.current = new ConversationCompletionGate()
    retryRef.current = null
    setState((current) => ({
      ...initialState,
      phase: 'ready',
      suggestion: current.suggestion,
    }))
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const controller = new AbortController()
    abortRef.current = controller

    void api.loadEntry(controller.signal)
      .then(async (entry) => {
        if (entry.activeSessionId) {
          await api.complete(
            entry.activeSessionId,
            'NAVIGATION',
            controller.signal,
          )
        }
        updatePhase('ready', { suggestion: entry.suggestion })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        retryRef.current = () => {
          window.location.reload()
        }
        updatePhase('error', {
          error: '대화 일정을 확인하지 못했어요. 다시 시도해주세요.',
        })
      })

    return () => {
      mountedRef.current = false
      controller.abort()
      void recorderRef.current?.cancel()
      const sessionId = sessionIdRef.current
      if (sessionId && completionGateRef.current.requestFinish()) {
        void completionGateRef.current.run(() =>
          api.complete(sessionId, 'NAVIGATION'),
        )
      }
    }
  }, [api, updatePhase])

  return {
    ...state,
    start,
    finishTurn,
    finish,
    retry,
    restart,
  }
}
