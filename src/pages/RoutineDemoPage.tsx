import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpeechPlayer } from '../features/tts/useSpeechPlayer'
import { CarePage } from './CarePage'
import type { RoutineDemoStep } from './carePages'

interface RoutineDemoPageProps {
  step: RoutineDemoStep
}

function audioControl(status: ReturnType<typeof useSpeechPlayer>['status']) {
  switch (status) {
    case 'loading':
      return { label: '음성 안내 준비 중', pending: true }
    case 'playing':
      return { label: '음성 안내 중', pending: true }
    case 'blocked':
      return { label: '음성 안내 듣기', pending: false }
    case 'error':
      return { label: '음성 안내 다시 시도', pending: false }
    default:
      return { label: '음성 안내 다시 듣기', pending: false }
  }
}

export function RoutineDemoPage({ step }: RoutineDemoPageProps) {
  const navigate = useNavigate()
  const {
    status,
    play,
    playAndWait,
    resumeAndWait,
  } = useSpeechPlayer()
  const sequenceRunRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const clearAdvanceTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const advance = useCallback(() => {
    const destination = step.advanceAfterSpeechTo
    if (!destination) return

    const delayMs = step.advanceDelayMs ?? 0
    clearAdvanceTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      navigate(destination)
    }, delayMs)
  }, [
    clearAdvanceTimer,
    navigate,
    step.advanceAfterSpeechTo,
    step.advanceDelayMs,
  ])

  const runSpeech = useCallback(
    async (force = false) => {
      if (force) clearAdvanceTimer()

      const runId = ++sequenceRunRef.current
      const speechKey = `routine-demo:${step.page.path}`
      const result = step.advanceAfterSpeechTo
        ? await playAndWait(step.speechText, speechKey, force)
        : await play(step.speechText, speechKey, force)

      if (
        runId === sequenceRunRef.current &&
        result === 'ended' &&
        step.advanceAfterSpeechTo
      ) {
        advance()
      }
    },
    [advance, clearAdvanceTimer, play, playAndWait, step],
  )

  useEffect(() => {
    void runSpeech()
    return () => {
      sequenceRunRef.current += 1
      clearAdvanceTimer()
    }
  }, [clearAdvanceTimer, runSpeech])

  const handleUtilityAction = useCallback(async () => {
    if (status === 'blocked') {
      const runId = ++sequenceRunRef.current
      const result = await resumeAndWait()
      if (
        runId === sequenceRunRef.current &&
        result === 'ended' &&
        step.advanceAfterSpeechTo
      ) {
        advance()
      }
      return
    }

    if (status === 'idle' || status === 'error') {
      void runSpeech(true)
    }
  }, [
    advance,
    resumeAndWait,
    runSpeech,
    status,
    step.advanceAfterSpeechTo,
  ])

  const control = audioControl(status)
  const actionTo = step.page.actionTo

  return (
    <CarePage
      page={step.page}
      onAction={actionTo ? () => navigate(actionTo) : undefined}
      utilityLabel={control.label}
      utilityPending={control.pending}
      onUtilityAction={handleUtilityAction}
    />
  )
}
