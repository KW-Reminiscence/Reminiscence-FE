export type CarePageTone = 'action' | 'disabled' | 'complete'

export interface CarePageDefinition {
  path: string
  navLabel: string
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  tone: CarePageTone
}

export interface RoutineDemoStep {
  page: CarePageDefinition
  speechText: string
  advanceAfterSpeechTo?: string
  advanceDelayMs?: number
}

export const routineDemoSteps: RoutineDemoStep[] = [
  {
    page: {
      path: '/care/breakfast',
      navLabel: '아침 식사 안내',
      title: '어르신~ 아침 드실 시간이예요~',
      description: '아침 꼭 챙겨드시고 여기 버튼 눌러주세요',
      actionLabel: '식사 기록하기',
      actionTo: '/care/breakfast/complete',
      tone: 'action',
    },
    speechText:
      '어르신~ 아침 드실 시간이예요~, 아침 꼭 챙겨드시고 여기 버튼 눌러주세요',
  },
  {
    page: {
      path: '/care/breakfast/complete',
      navLabel: '아침 식사 기록 완료',
      title: '기록 되었어요!',
      description: '아침약 드실 시간에 알려드릴게요!',
      tone: 'complete',
    },
    speechText:
      '어르신~ 이따가 아침약 드실 시간에 다시 알려드릴게요~',
    advanceAfterSpeechTo: '/care/medication',
    advanceDelayMs: 5_000,
  },
  {
    page: {
      path: '/care/medication',
      navLabel: '아침약 안내',
      title: '아침약 드실 시간이예요!',
      description: '아침약을 먹고 버튼을 눌러주세요',
      actionLabel: '아침약 기록하기',
      actionTo: '/care/medication/complete',
      tone: 'action',
    },
    speechText:
      '어르신~ 아침약 드실 시간이예요~, 귀찮으시더라도 꼭 챙겨 드시고 버튼을 눌러주세요!',
  },
  {
    page: {
      path: '/care/medication/complete',
      navLabel: '아침약 기록 완료',
      title: '기록 되었어요!',
      description: '점심 드실 시간에 알려드릴게요!',
      tone: 'complete',
    },
    speechText:
      '어르신~ 이따가 점심 드실 시간에 다시 알려드릴게요~',
    advanceAfterSpeechTo: '/conversation/start',
  },
]

export const carePages: CarePageDefinition[] = [
  ...routineDemoSteps.map((step) => step.page),
  {
    path: '/conversation/start',
    navLabel: '대화 시작 유도',
    title: '저랑 대화하실래요?',
    description: '위 버튼을 눌러 대화를 시작해요',
    actionLabel: '대화 시작하기',
    actionTo: '/conversation',
    tone: 'action',
  },
  {
    path: '/conversation/active',
    navLabel: '대화 진행 중',
    title: '제가 잘 듣고 있어요!',
    description: '버튼을 눌러 대화를 끝낼 수 있어요.',
    actionLabel: '대화 끝내기',
    actionTo: '/conversation/start',
    tone: 'action',
  },
  {
    path: '/conversation/connecting',
    navLabel: '대화 연결 처리 중',
    title: '지금 대화를 시작하고 있어요.',
    description: '버튼을 눌러 대화를 끝낼 수 있어요.',
    actionLabel: '대화 끝내기',
    tone: 'disabled',
  },
  {
    path: '/care/recorded',
    navLabel: '기록 완료 알림',
    title: '기록 되었어요!',
    description: '아침약 드실 시간에 알려드릴게요!',
    tone: 'complete',
  },
]

export function findCarePage(pathname: string) {
  return carePages.find((page) => page.path === pathname)
}

export function findRoutineDemoStep(pathname: string) {
  return routineDemoSteps.find((step) => step.page.path === pathname)
}
