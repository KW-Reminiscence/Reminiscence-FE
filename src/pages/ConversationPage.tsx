import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { publicAssetPath } from '../config/paths'
import {
  photoMemoryImageAlt,
  photoMemoryImageUrl,
} from '../features/conversation/photoMemory'
import { listeningDescription } from '../features/conversation/conversationCopy'
import { useConversationSession } from '../features/conversation/useConversationSession'
import { CarePage } from './CarePage'
import type { CarePageDefinition } from './carePages'

export function ConversationPage() {
  const conversation = useConversationSession()
  const navigate = useNavigate()
  useEffect(() => {
    if (conversation.phase !== 'completed') return
    const timer = window.setTimeout(() => navigate('/', { replace: true }), 2_000)
    return () => window.clearTimeout(timer)
  }, [conversation.phase, navigate])
  const today = useMemo(() => {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(now)
    const values = Object.fromEntries(
      parts
        .filter(({ type }) => ['year', 'month', 'day'].includes(type))
        .map(({ type, value }) => [type, value]),
    )
    return {
      label: `${values.year}년 ${values.month}월 ${values.day}일`,
      value: `${values.year}-${values.month.padStart(2, '0')}-${values.day.padStart(2, '0')}`,
    }
  }, [])

  let page: CarePageDefinition = {
    path: '/conversation',
    navLabel: '대화',
    title: '대화 일정을 확인하고 있어요.',
    description: '잠시만 기다려주세요.',
    tone: 'disabled',
  }
  let onAction: (() => void) | undefined
  let utilityLabel: string | undefined
  let onUtilityAction: (() => void) | undefined

  if (conversation.phase === 'ready') {
    page = {
      ...page,
      title:
        conversation.suggestion?.display_text ?? '저랑 대화하실래요?',
      description: '버튼을 누르면 질문을 들려드릴게요.',
      actionLabel: conversation.suggestion?.start_label ?? '대화 시작하기',
      tone: 'action',
    }
    onAction = conversation.start
  } else if (
    ['starting', 'asking', 'uploading', 'completing'].includes(
      conversation.phase,
    )
  ) {
    const messages = {
      starting: ['대화를 시작하고 있어요.', '잠시만 기다려주세요.'],
      asking: [
        conversation.question?.display_text ?? '질문을 들려드리고 있어요.',
        '질문이 끝나면 말씀해주세요.',
      ],
      uploading: ['말씀을 잘 들었어요.', '다음 질문을 준비하고 있어요.'],
      completing: ['대화를 마무리하고 있어요.', '기록을 저장하고 있어요.'],
    } as const
    const [title, description] =
      messages[conversation.phase as keyof typeof messages]
    page = { ...page, title, description }
    utilityLabel = conversation.phase !== 'completing' ? '대화 끝내기' : undefined
    onUtilityAction = utilityLabel ? conversation.finish : undefined
  } else if (
    conversation.phase === 'listening' ||
    conversation.phase === 'silence'
  ) {
    const progress = conversation.progress
    page = {
      ...page,
      title: conversation.question?.display_text ?? '제가 잘 듣고 있어요!',
      description: listeningDescription(progress),
      actionLabel: '답변 마쳤어요',
      tone: 'action',
    }
    onAction = conversation.finishTurn
    utilityLabel = '대화 끝내기'
    onUtilityAction = conversation.finish
  } else if (
    conversation.phase === 'audio-blocked' ||
    conversation.phase === 'microphone-error' ||
    conversation.phase === 'error'
  ) {
    page = {
      ...page,
      title:
        conversation.phase === 'microphone-error'
          ? '마이크 연결을 확인해주세요.'
          : '잠시 문제가 생겼어요.',
      description: conversation.error ?? '다시 시도해주세요.',
      actionLabel:
        conversation.phase === 'audio-blocked'
          ? '질문 듣기'
          : conversation.phase === 'microphone-error'
            ? '마이크 다시 연결'
            : '다시 시도하기',
      tone: 'action',
    }
    onAction = conversation.retry
    if (conversation.question) {
      utilityLabel = '대화 끝내기'
      onUtilityAction = conversation.finish
    }
  } else if (conversation.phase === 'completed') {
    page = {
      ...page,
      title: '오늘 대화를 기록했어요.',
      description: '함께 이야기해주셔서 고마워요. 가족사진 홈으로 돌아갈게요.',
      actionLabel: '가족사진 홈으로 돌아가기',
      tone: 'complete',
    }
    onAction = () => navigate('/', { replace: true })
  }

  return (
    <CarePage
      page={page}
      dateLabel={today.label}
      dateTime={today.value}
      secondaryDateLabel={null}
      imageUrl={
        photoMemoryImageUrl(conversation.photo) ??
        publicAssetPath('demo-family-placeholder.svg')
      }
      imageAlt={photoMemoryImageAlt(conversation.photo)}
      onAction={onAction}
      utilityLabel={utilityLabel}
      onUtilityAction={onUtilityAction}
    />
  )
}
