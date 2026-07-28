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

export const carePages: CarePageDefinition[] = [
  {
    path: '/care/breakfast',
    navLabel: '아침 식사 안내',
    title: '혹시 아침 드셨나요?',
    description: '아침을 먹고 버튼을 눌러주세요',
    actionLabel: '식사 기록하기',
    actionTo: '/care/recorded',
    tone: 'action',
  },
  {
    path: '/care/medication',
    navLabel: '아침약 안내',
    title: '아침약 드실 시간이예요!',
    description: '아침을 먹고 버튼을 눌러주세요',
    actionLabel: '아침약 기록하기',
    actionTo: '/care/recorded',
    tone: 'action',
  },
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
