import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, confirmRoutine } from '../api/client'
import type { RoutinePrompt } from '../api/types'
import {
  formatServerDate,
  routinePageDefinition,
  routineSpeechKey,
} from '../features/routine/routineView'
import { useRoutinePolling } from '../features/routine/useRoutinePolling'
import { useSpeechPlayer } from '../features/tts/useSpeechPlayer'
import { CarePage } from './CarePage'
import type { CarePageDefinition } from './carePages'

const loadingPage: CarePageDefinition = {
  path: '/tablet',
  navLabel: '일정 확인 중',
  title: '오늘 일정을 확인하고 있어요.',
  description: '잠시만 기다려주세요.',
  tone: 'disabled',
}

const idlePage: CarePageDefinition = {
  path: '/tablet',
  navLabel: '대기 화면',
  title: '지금은 예정된 일정이 없어요.',
  description: '새로운 일정이 생기면 바로 알려드릴게요.',
  tone: 'complete',
}

const errorPage: CarePageDefinition = {
  path: '/tablet',
  navLabel: '연결 오류',
  title: '서버와 연결할 수 없어요.',
  description: '연결을 확인한 뒤 다시 시도해주세요.',
  actionLabel: '다시 시도하기',
  tone: 'action',
}

const completedPage: CarePageDefinition = {
  path: '/tablet',
  navLabel: '기록 완료',
  title: '기록 되었어요!',
  description: '다음 일정이 생기면 알려드릴게요.',
  tone: 'complete',
}

function audioUtilityLabel(status: ReturnType<typeof useSpeechPlayer>['status']) {
  if (status === 'blocked') return '음성 안내 듣기'
  if (status === 'error') return '음성 안내 다시 시도'
  return undefined
}

export function TabletPage() {
  const {
    status: routineStatus,
    data: routineData,
    refresh: refreshRoutines,
  } = useRoutinePolling()
  const {
    status: speechStatus,
    play: playSpeech,
    resume: resumeSpeech,
  } = useSpeechPlayer()
  const [confirming, setConfirming] = useState(false)
  const [completed, setCompleted] = useState<RoutinePrompt | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const prompt = routineData?.items[0] ?? null
  const serverDate = useMemo(
    () =>
      formatServerDate(
        routineData?.server_time ?? new Date().toISOString(),
      ),
    [routineData?.server_time],
  )

  useEffect(() => {
    if (!prompt || completed) return
    void playSpeech(prompt.spoken_text, routineSpeechKey(prompt))
  }, [completed, playSpeech, prompt])

  useEffect(() => {
    if (!completed) return
    const timer = window.setTimeout(() => {
      setCompleted(null)
      refreshRoutines()
    }, 3_000)
    return () => window.clearTimeout(timer)
  }, [completed, refreshRoutines])

  const handleConfirm = useCallback(async () => {
    if (!prompt || confirming) return
    setConfirming(true)
    setActionError(null)

    try {
      await confirmRoutine(prompt.execution_id)
      setCompleted(prompt)
    } catch (cause) {
      if (cause instanceof ApiError && [404, 409].includes(cause.status)) {
        refreshRoutines()
        setActionError('이미 종료된 일정이에요. 현재 일정을 다시 확인할게요.')
      } else {
        setActionError('기록하지 못했어요. 잠시 후 다시 눌러주세요.')
      }
    } finally {
      setConfirming(false)
    }
  }, [confirming, prompt, refreshRoutines])

  const handleAudioUtility = useCallback(() => {
    if (!prompt) return
    if (speechStatus === 'blocked') {
      void resumeSpeech()
      return
    }
    void playSpeech(prompt.spoken_text, routineSpeechKey(prompt), true)
  }, [playSpeech, prompt, resumeSpeech, speechStatus])

  if (completed) {
    return (
      <CarePage
        page={completedPage}
        dateLabel={serverDate.dateLabel}
        dateTime={serverDate.dateTime}
        secondaryDateLabel={null}
      />
    )
  }

  if (routineStatus === 'loading') {
    return (
      <CarePage
        page={loadingPage}
        dateLabel={serverDate.dateLabel}
        dateTime={serverDate.dateTime}
        secondaryDateLabel={null}
      />
    )
  }

  if (routineStatus === 'error' && !routineData) {
    return (
      <CarePage
        page={errorPage}
        dateLabel={serverDate.dateLabel}
        dateTime={serverDate.dateTime}
        secondaryDateLabel={null}
        onAction={refreshRoutines}
      />
    )
  }

  if (!prompt) {
    return (
      <CarePage
        page={idlePage}
        dateLabel={serverDate.dateLabel}
        dateTime={serverDate.dateTime}
        secondaryDateLabel={null}
      />
    )
  }

  const page = routinePageDefinition(prompt)
  if (actionError) page.description = actionError

  return (
    <CarePage
      page={page}
      dateLabel={serverDate.dateLabel}
      dateTime={serverDate.dateTime}
      secondaryDateLabel={null}
      actionPending={confirming}
      onAction={handleConfirm}
      utilityLabel={audioUtilityLabel(speechStatus)}
      onUtilityAction={handleAudioUtility}
    />
  )
}
