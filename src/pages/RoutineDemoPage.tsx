import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpeechPlayer } from '../features/tts/useSpeechPlayer'
import { CarePage } from './CarePage'
import type { RoutineDemoStep } from './carePages'

interface RoutineDemoPageProps {
  step: RoutineDemoStep
}

function utilityLabel(status: ReturnType<typeof useSpeechPlayer>['status']) {
  if (status === 'blocked') return '음성 안내 듣기'
  if (status === 'error') return '음성 안내 다시 시도'
  return undefined
}

export function RoutineDemoPage({ step }: RoutineDemoPageProps) {
  const navigate = useNavigate()
  const {
    status,
    play,
    playAndWait,
    resumeAndWait,
  } = useSpeechPlayer()
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const sequenceRunRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  const clearAdvanceTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    timerRef.current = null
    intervalRef.current = null
  }, [])

  const advance = useCallback(() => {
    const destination = step.advanceAfterSpeechTo
    if (!destination) return

    const delayMs = step.advanceDelayMs ?? 0
    if (delayMs === 0) {
      navigate(destination)
      return
    }

    clearAdvanceTimers()
    setRemainingSeconds(Math.ceil(delayMs / 1_000))
    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((current) =>
        current === null ? null : Math.max(0, current - 1),
      )
    }, 1_000)
    timerRef.current = window.setTimeout(() => {
      clearAdvanceTimers()
      navigate(destination)
    }, delayMs)
  }, [
    clearAdvanceTimers,
    navigate,
    step.advanceAfterSpeechTo,
    step.advanceDelayMs,
  ])

  const runSpeech = useCallback(
    async (force = false) => {
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
    [advance, play, playAndWait, step],
  )

  useEffect(() => {
    void runSpeech()
    return () => {
      sequenceRunRef.current += 1
      clearAdvanceTimers()
    }
  }, [clearAdvanceTimers, runSpeech])

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

    void runSpeech(true)
  }, [
    advance,
    resumeAndWait,
    runSpeech,
    status,
    step.advanceAfterSpeechTo,
  ])

  const page = useMemo(() => {
    if (remainingSeconds === null) return step.page
    return {
      ...step.page,
      description: `${remainingSeconds}초 후 아침약 안내를 시작할게요.`,
    }
  }, [remainingSeconds, step.page])

  return (
    <CarePage
      page={page}
      onAction={
        step.page.actionTo
          ? () => navigate(step.page.actionTo as string)
          : undefined
      }
      utilityLabel={utilityLabel(status)}
      onUtilityAction={handleUtilityAction}
    />
  )
}
