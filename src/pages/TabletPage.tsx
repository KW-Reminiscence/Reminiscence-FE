import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, completeConversation, confirmRoutine } from '../api/client'
import type { RoutinePrompt } from '../api/types'
import {
  photoMemoryImageAlt,
  photoMemoryImageUrl,
} from '../features/conversation/photoMemory'
import {
  formatServerDate,
  routinePageDefinition,
  routineSpeechKey,
} from '../features/routine/routineView'
import { useTabletStatePolling } from '../features/tablet/useTabletStatePolling'
import { useSpeechPlayer } from '../features/tts/useSpeechPlayer'
import { CarePage } from './CarePage'
import type { CarePageDefinition } from './carePages'

const placeholderImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"%3E%3Crect width="1200" height="800" fill="%23e8e1d3"/%3E%3Ccircle cx="600" cy="310" r="120" fill="%23b6ab95"/%3E%3Cpath d="M300 720c40-180 160-280 300-280s260 100 300 280" fill="%23b6ab95"/%3E%3C/svg%3E'

const loadingPage: CarePageDefinition = {
  path: '/',
  navLabel: '홈 확인 중',
  title: '오늘의 돌봄 상태를 확인하고 있어요.',
  description: '잠시만 기다려주세요.',
  tone: 'disabled',
}

const errorPage: CarePageDefinition = {
  path: '/',
  navLabel: '연결 오류',
  title: '최신 상태를 확인할 수 없어요.',
  description: '이전 일정은 표시하지 않았어요. 연결을 확인한 뒤 다시 시도해주세요.',
  actionLabel: '다시 시도하기',
  tone: 'action',
}

const completedPage: CarePageDefinition = {
  path: '/',
  navLabel: '기록 완료',
  title: '기록 되었어요!',
  description: '가족사진 홈으로 돌아갈게요.',
  tone: 'complete',
}

function audioUtilityLabel(status: ReturnType<typeof useSpeechPlayer>['status']) {
  if (status === 'blocked') return '음성 안내 듣기'
  if (status === 'error') return '음성 안내 다시 시도'
  return undefined
}

export function TabletPage() {
  const navigate = useNavigate()
  const {
    status: tabletStatus,
    data: tabletData,
    refresh: refreshTablet,
  } = useTabletStatePolling()
  const {
    status: speechStatus,
    play: playSpeech,
    resume: resumeSpeech,
  } = useSpeechPlayer()
  const [confirming, setConfirming] = useState(false)
  const [completed, setCompleted] = useState<RoutinePrompt | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [recoveringConversation, setRecoveringConversation] = useState(false)

  const prompt = tabletData?.active_routines[0] ?? null
  const photo = tabletData?.photos[0] ?? null
  const imageUrl = photoMemoryImageUrl(photo) ?? placeholderImage
  const serverDate = useMemo(
    () => formatServerDate(tabletData?.server_time ?? new Date().toISOString()),
    [tabletData?.server_time],
  )

  useEffect(() => {
    if (!prompt || completed || tabletStatus !== 'ready') return
    void playSpeech(prompt.spoken_text, routineSpeechKey(prompt))
  }, [completed, playSpeech, prompt, tabletStatus])

  useEffect(() => {
    if (!completed) return
    const timer = window.setTimeout(() => {
      setCompleted(null)
      refreshTablet()
    }, 2_000)
    return () => window.clearTimeout(timer)
  }, [completed, refreshTablet])

  const handleConfirm = useCallback(async () => {
    if (!prompt || confirming) return
    setConfirming(true)
    setActionError(null)
    try {
      await confirmRoutine(prompt.execution_id)
      setCompleted(prompt)
    } catch (cause) {
      if (cause instanceof ApiError && [404, 409].includes(cause.status)) {
        refreshTablet()
        setActionError('이미 종료된 일정이에요. 현재 상태를 다시 확인할게요.')
      } else {
        setActionError('기록하지 못했어요. 잠시 후 다시 눌러주세요.')
      }
    } finally {
      setConfirming(false)
    }
  }, [confirming, prompt, refreshTablet])

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
        imageUrl={imageUrl}
        imageAlt={photoMemoryImageAlt(photo)}
      />
    )
  }

  if (tabletStatus === 'loading') {
    return <CarePage page={loadingPage} secondaryDateLabel={null} imageUrl={imageUrl} />
  }

  if (tabletStatus === 'error' || tabletStatus === 'stale') {
    return (
      <CarePage
        page={errorPage}
        dateLabel={serverDate.dateLabel}
        dateTime={serverDate.dateTime}
        secondaryDateLabel={null}
        imageUrl={imageUrl}
        imageAlt={photoMemoryImageAlt(photo)}
        onAction={refreshTablet}
      />
    )
  }

  if (prompt) {
    const page = routinePageDefinition(prompt)
    if (actionError) page.description = actionError
    return (
      <CarePage
        page={page}
        dateLabel={serverDate.dateLabel}
        dateTime={serverDate.dateTime}
        secondaryDateLabel={null}
        imageUrl={imageUrl}
        imageAlt={photoMemoryImageAlt(photo)}
        actionPending={confirming}
        onAction={handleConfirm}
        utilityLabel={audioUtilityLabel(speechStatus)}
        onUtilityAction={handleAudioUtility}
      />
    )
  }

  const activeSessionId = tabletData?.active_conversation_session_id
  if (activeSessionId) {
    const interruptedPage: CarePageDefinition = {
      path: '/',
      navLabel: '대화 복구',
      title: '이전 대화가 마무리되지 않았어요.',
      description:
        actionError ?? '이전 기록을 안전하게 닫은 뒤 새 대화를 시작할 수 있어요.',
      actionLabel: '이전 대화 마무리하기',
      tone: 'action',
    }
    return (
      <CarePage
        page={interruptedPage}
        dateLabel={serverDate.dateLabel}
        dateTime={serverDate.dateTime}
        secondaryDateLabel={null}
        imageUrl={imageUrl}
        imageAlt={photoMemoryImageAlt(photo)}
        actionPending={recoveringConversation}
        onAction={() => {
          if (recoveringConversation) return
          setRecoveringConversation(true)
          setActionError(null)
          void completeConversation(activeSessionId, 'NAVIGATION')
            .then(() => refreshTablet())
            .catch(() => {
              setActionError('이전 대화를 마무리하지 못했어요. 다시 시도해주세요.')
            })
            .finally(() => setRecoveringConversation(false))
        }}
      />
    )
  }

  const suggestion = tabletData?.conversation_suggestion
  const homePage: CarePageDefinition = suggestion?.suggested
    ? {
        path: '/',
        navLabel: '대화 시간',
        title: suggestion.display_text ?? '함께 이야기할 시간이에요.',
        description: '가족사진을 보며 편안하게 이야기해요.',
        actionLabel: suggestion.start_label ?? '대화 시작하기',
        tone: 'action',
      }
    : {
        path: '/',
        navLabel: '가족사진 홈',
        title: photo ? '소중한 가족사진이에요.' : '오늘도 편안한 하루 보내세요.',
        description: '사진을 보며 떠오르는 이야기가 있으면 들려주세요.',
        actionLabel: '추억 이야기 시작하기',
        tone: 'action',
      }

  return (
    <CarePage
      page={homePage}
      dateLabel={serverDate.dateLabel}
      dateTime={serverDate.dateTime}
      secondaryDateLabel={null}
      imageUrl={imageUrl}
      imageAlt={photoMemoryImageAlt(photo)}
      onAction={() => navigate('/conversation')}
    />
  )
}
