import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { synthesizeDemoSpeech } from '../api/client'
import { publicAssetPath } from '../config/paths'
import { listeningDescription } from '../features/conversation/conversationCopy'
import { microphoneErrorMessage } from '../features/conversation/microphoneError'
import { PcmTurnRecorder } from '../features/conversation/pcmTurnRecorder'
import type { TurnProgress } from '../features/conversation/turnDetector'
import type { DemoDate } from '../features/routine/useDemoDate'
import { useSpeechPlayer } from '../features/tts/useSpeechPlayer'
import { CarePage } from './CarePage'
import type { CarePageDefinition } from './carePages'

interface DemoConversationPageProps {
  demoDate: DemoDate
}

const questions = [
  '가족사진을 보니 어떤 날이 떠오르세요?',
  '그날 가장 기억에 남는 이야기를 들려주세요.',
] as const

type ActivePhase =
  | 'asking'
  | 'listening'
  | 'silence'
  | 'transition'
  | 'audio-blocked'
  | 'microphone-error'
  | 'completed'

export function DemoConversationPage({ demoDate }: DemoConversationPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [activePhase, setActivePhase] = useState<ActivePhase>('asking')
  const [progress, setProgress] = useState<TurnProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<PcmTurnRecorder | null>(null)
  const speechRunRef = useRef(0)
  const {
    playAndWait,
    resumeAndWait,
    status: speechStatus,
    stop: stopSpeech,
  } = useSpeechPlayer(synthesizeDemoSpeech)
  const isStart = location.pathname.endsWith('/start')
  const isConnecting = location.pathname.endsWith('/connecting')
  const question = questions[questionIndex]

  const finishConversation = useCallback(async () => {
    speechRunRef.current += 1
    stopSpeech()
    await recorderRef.current?.cancel()
    recorderRef.current = null
    setProgress(null)
    setError(null)
    setActivePhase('completed')
  }, [stopSpeech])

  const startRecorder = useCallback(async () => {
    setActivePhase('listening')
    setProgress(null)
    setError(null)

    const recorder = new PcmTurnRecorder({
      onProgress(nextProgress) {
        setProgress(nextProgress)
        setActivePhase(nextProgress.phase === 'silence' ? 'silence' : 'listening')
      },
      onComplete() {
        recorderRef.current = null
        setProgress(null)
        setActivePhase('transition')
      },
    })
    recorderRef.current = recorder

    try {
      await recorder.start()
    } catch (cause) {
      recorderRef.current = null
      setError(microphoneErrorMessage(cause))
      setActivePhase('microphone-error')
    }
  }, [])

  const askQuestion = useCallback(async () => {
    const runId = ++speechRunRef.current
    await recorderRef.current?.cancel()
    recorderRef.current = null
    setProgress(null)
    setError(null)
    setActivePhase('asking')

    const result = await playAndWait(
      question,
      `conversation-demo:${questionIndex}`,
      true,
    )
    if (runId !== speechRunRef.current) return
    if (result !== 'ended') {
      setError('질문 음성을 재생하지 못했어요. 아래 버튼을 눌러 다시 시도해주세요.')
      setActivePhase('audio-blocked')
      return
    }
    await startRecorder()
  }, [playAndWait, question, questionIndex, startRecorder])

  const resumeQuestion = useCallback(async () => {
    const runId = ++speechRunRef.current
    setError(null)
    setActivePhase('asking')
    const result = await resumeAndWait()
    if (runId !== speechRunRef.current) return
    if (result !== 'ended') {
      setError('질문 음성을 재생하지 못했어요. 아래 버튼을 눌러 다시 시도해주세요.')
      setActivePhase('audio-blocked')
      return
    }
    await startRecorder()
  }, [resumeAndWait, startRecorder])

  useEffect(() => {
    if (isStart || isConnecting || activePhase !== 'asking') return
    void askQuestion()
  }, [activePhase, askQuestion, isConnecting, isStart])

  useEffect(() => {
    if (!isConnecting) return
    const timer = window.setTimeout(
      () => navigate('/demo/conversation/active', { replace: true }),
      900,
    )
    return () => window.clearTimeout(timer)
  }, [isConnecting, navigate])

  useEffect(() => {
    if (activePhase !== 'transition') return
    const timer = window.setTimeout(() => {
      if (questionIndex === questions.length - 1) {
        setActivePhase('completed')
        return
      }
      setQuestionIndex((current) => current + 1)
      setActivePhase('asking')
    }, 1_000)
    return () => window.clearTimeout(timer)
  }, [activePhase, questionIndex])

  useEffect(
    () => () => {
      speechRunRef.current += 1
      stopSpeech()
      void recorderRef.current?.cancel()
    },
    [stopSpeech],
  )

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
    onAction = () => {
      setQuestionIndex(0)
      setActivePhase('asking')
      navigate('/demo/conversation/connecting')
    }
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
    onUtilityAction = () => void finishConversation()
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
  } else if (activePhase === 'microphone-error') {
    page = {
      path: location.pathname,
      navLabel: '마이크 연결 오류',
      title: '마이크 연결을 확인해주세요.',
      description: error ?? '마이크를 다시 연결해주세요.',
      actionLabel: '마이크 다시 연결',
      tone: 'action',
    }
    onAction = () => void startRecorder()
    utilityLabel = '대화 끝내기'
    onUtilityAction = () => void finishConversation()
  } else if (activePhase === 'audio-blocked') {
    page = {
      path: location.pathname,
      navLabel: '질문 음성 오류',
      title: '질문을 다시 들려드릴게요.',
      description: error ?? '아래 버튼을 눌러 다시 시도해주세요.',
      actionLabel: '질문 다시 듣기',
      tone: 'action',
    }
    onAction = () => {
      if (speechStatus === 'blocked') {
        void resumeQuestion()
        return
      }
      void askQuestion()
    }
    utilityLabel = '대화 끝내기'
    onUtilityAction = () => void finishConversation()
  } else if (activePhase === 'asking') {
    page = {
      path: location.pathname,
      navLabel: '질문 재생 중',
      title: question,
      description: '질문이 끝나면 말씀해주세요.',
      tone: 'disabled',
    }
    utilityLabel = '대화 끝내기'
    onUtilityAction = () => void finishConversation()
  } else {
    page = {
      path: location.pathname,
      navLabel: '대화 진행 중',
      title: question,
      description: listeningDescription(progress),
      actionLabel: '답변 마쳤어요',
      tone: 'action',
    }
    onAction = () => void recorderRef.current?.stop()
    utilityLabel = '대화 끝내기'
    onUtilityAction = () => void finishConversation()
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
