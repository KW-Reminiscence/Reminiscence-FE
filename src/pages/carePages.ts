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
      title: '아침 식사하실 시간이에요!',
      description: '식사를 마치고 아래 버튼을 눌러주세요.',
      actionLabel: '식사 완료',
      actionTo: '/care/breakfast/complete',
      tone: 'action',
    },
    speechText:
      '아침 식사하실 시간이에요. 식사를 마치고 아래 완료 버튼을 눌러주세요.',
  },
  {
    page: {
      path: '/care/breakfast/complete',
      navLabel: '아침 식사 완료',
      title: '완료되셨어요!',
      description: '음성 안내가 끝나면 5초 후 아침약을 알려드릴게요.',
      tone: 'complete',
    },
    speechText: '완료되셨어요. 5초 후 아침 약을 안내해드릴게요.',
    advanceAfterSpeechTo: '/care/medication',
    advanceDelayMs: 5_000,
  },
  {
    page: {
      path: '/care/medication',
      navLabel: '아침약 안내',
      title: '아침약 드실 시간이에요!',
      description: '약을 드시고 아래 버튼을 눌러주세요.',
      actionLabel: '복약 완료',
      actionTo: '/care/medication/complete',
      tone: 'action',
    },
    speechText:
      '아침 약 드실 시간이에요. 약을 드시고 아래 완료 버튼을 눌러주세요.',
  },
  {
    page: {
      path: '/care/medication/complete',
      navLabel: '아침약 복약 완료',
      title: '완료되셨어요!',
      description: '음성 안내가 끝나면 대화 시작 화면으로 이동할게요.',
      tone: 'complete',
    },
    speechText: '완료되셨어요. 이제 저와 대화를 시작해볼까요?',
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
]

export function findCarePage(pathname: string) {
  return carePages.find((page) => page.path === pathname)
}

export function findRoutineDemoStep(pathname: string) {
  return routineDemoSteps.find((step) => step.page.path === pathname)
}
