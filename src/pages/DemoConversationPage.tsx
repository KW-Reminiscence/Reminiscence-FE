import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { publicAssetPath } from '../config/paths'
import type { DemoDate } from '../features/routine/useDemoDate'
import { CarePage } from './CarePage'
import type { CarePageDefinition } from './carePages'

interface DemoConversationPageProps {
  demoDate: DemoDate
}

const questions = [
  '가족사진을 보니 어떤 날이 떠오르세요?',
  '그날 가장 기억에 남는 이야기를 들려주세요.',
] as const

type ActivePhase = 'listening' | 'transition' | 'completed'

function speak(text: string) {
  if (
    typeof window.speechSynthesis === 'undefined' ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    return
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ko-KR'
  utterance.rate = 0.9
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export function DemoConversationPage({ demoDate }: DemoConversationPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [activePhase, setActivePhase] = useState<ActivePhase>('listening')
  const isStart = location.pathname.endsWith('/start')
  const isConnecting = location.pathname.endsWith('/connecting')
  const question = questions[questionIndex]

  useEffect(() => {
    if (!isConnecting) return
    const timer = window.setTimeout(
      () => navigate('/demo/conversation/active', { replace: true }),
      900,
    )
    return () => window.clearTimeout(timer)
  }, [isConnecting, navigate])

  useEffect(() => {
    if (isStart || isConnecting || activePhase !== 'listening') return
    speak(question)
    return () => window.speechSynthesis?.cancel()
  }, [activePhase, isConnecting, isStart, question])

  const finishAnswer = useCallback(() => {
    if (questionIndex === questions.length - 1) {
      window.speechSynthesis?.cancel()
      setActivePhase('completed')
      return
    }

    window.speechSynthesis?.cancel()
    setActivePhase('transition')
  }, [questionIndex])

  useEffect(() => {
    if (activePhase !== 'transition') return
    const timer = window.setTimeout(() => {
      setQuestionIndex((current) => current + 1)
      setActivePhase('listening')
    }, 1_000)
    return () => window.clearTimeout(timer)
  }, [activePhase])

  let page: CarePageDefinition
  let onAction: (() => void) | undefined
  let utilityLabel: string | undefined
  let onUtilityAction: (() => void) | undefined

  if (isStart) {
    page = {
      path: location.pathname,
      navLabel: '대화 시작 유도',
      title: '저랑 대화하실래요?',
      description: '버튼을 누르면 사진에 관한 질문을 들려드릴게요.',
      actionLabel: '대화 시작하기',
      tone: 'action',
    }
    onAction = () => navigate('/demo/conversation/connecting')
  } else if (isConnecting) {
    page = {
      path: location.pathname,
      navLabel: '대화 연결 처리 중',
      title: '대화를 준비하고 있어요.',
      description: '잠시만 기다려주세요.',
      actionLabel: '대화 준비 중',
      tone: 'disabled',
    }
  } else if (activePhase === 'transition') {
    page = {
      path: location.pathname,
      navLabel: '다음 질문 준비 중',
      title: '말씀을 잘 들었어요.',
      description: '다음 질문을 준비하고 있어요.',
      tone: 'disabled',
    }
    utilityLabel = '대화 끝내기'
    onUtilityAction = () => setActivePhase('completed')
  } else if (activePhase === 'completed') {
    page = {
      path: location.pathname,
      navLabel: '대화 완료',
      title: '오늘 대화를 마쳤어요.',
      description: '함께 이야기해주셔서 고마워요.',
      actionLabel: '처음으로 돌아가기',
      tone: 'complete',
    }
    onAction = () => navigate('/demo/conversation/start', { replace: true })
  } else {
    page = {
      path: location.pathname,
      navLabel: '대화 진행 중',
      title: question,
      description: '말씀을 마치면 아래 버튼을 눌러주세요.',
      actionLabel: '답변 마쳤어요',
      tone: 'action',
    }
    onAction = finishAnswer
    utilityLabel = '대화 끝내기'
    onUtilityAction = () => {
      window.speechSynthesis?.cancel()
      setActivePhase('completed')
    }
  }

  return (
    <CarePage
      page={page}
      dateLabel={demoDate.dateLabel}
      dateTime={demoDate.dateTime}
      secondaryDateLabel={demoDate.secondaryDateLabel}
      imageUrl={publicAssetPath('family-photo.png')}
      imageAlt="한자리에 모여 웃고 있는 AI 생성 가족"
      onAction={onAction}
      utilityLabel={utilityLabel}
      onUtilityAction={onUtilityAction}
    />
  )
}
