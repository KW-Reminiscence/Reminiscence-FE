import { useCallback, useEffect, useRef, useState } from 'react'
import {
  completeConversation,
  getConversationSuggestion,
  recordConversationTurn,
  startConversation,
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

export function useConversationSession() {
  const [state, setState] = useState<ConversationState>(initialState)
  const { playAndWait, stop: stopSpeech } = useSpeechPlayer()
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
        completeConversation(sessionId, 'USER_FINISHED', abortRef.current.signal),
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
  }, [updatePhase])

  const handleCapturedTurn = useCallback(
    async (turn: CapturedTurn, turnId = crypto.randomUUID()) => {
      recorderRef.current = null
      const sessionId = sessionIdRef.current
      if (!sessionId) return

      completionGateRef.current.beginUpload()
      updatePhase('uploading', { error: null, progress: null })
      try {
        const response = await recordConversationTurn(
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
    [finalize, updatePhase],
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
    } catch {
      recorderRef.current = null
      retryRef.current = () => {
        void startRecorder()
      }
      updatePhase('microphone-error', {
        error:
          '마이크를 연결하지 못했어요. 브라우저의 마이크 권한을 확인해주세요.',
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
      const response = await startConversation(
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
  }, [processQuestion, state.suggestion, updatePhase])

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

    void getConversationSuggestion(controller.signal)
      .then((suggestion) => {
        updatePhase('ready', { suggestion })
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
          completeConversation(sessionId, 'NAVIGATION'),
        )
      }
    }
  }, [updatePhase])

  return {
    ...state,
    start,
    finishTurn,
    finish,
    retry,
    restart,
  }
}
