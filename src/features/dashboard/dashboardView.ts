import type {
  ConversationSummary,
  PersonalState,
  RoutineExecution,
} from '../../api/types'

export interface DashboardRecord {
  id: string
  kind: 'routine' | 'conversation'
  title: string
  dateLabel: string
  statusLabel: string
  timestamp: string
}

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function buildDashboardRecords(
  routines: readonly RoutineExecution[],
  conversations: readonly ConversationSummary[],
) {
  const routineRecords: DashboardRecord[] = routines.map((routine) => ({
    id: `routine:${routine.execution_id}`,
    kind: 'routine',
    title: routine.routine_id.replaceAll(/[-_]/g, ' '),
    dateLabel: formatRecordDate(routine.scheduled_at),
    statusLabel:
      routine.state === 'CONFIRMED'
        ? '완료'
        : routine.state === 'NOT_ANSWERED'
          ? '응답 없음'
          : '알림 중',
    timestamp: routine.scheduled_at,
  }))
  const conversationRecords: DashboardRecord[] = conversations.map(
    (conversation) => ({
      id: `conversation:${conversation.session_id}`,
      kind: 'conversation',
      title: `대화 ${conversation.user_turn_count}회 기록`,
      dateLabel: formatRecordDate(conversation.started_at),
      statusLabel:
        conversation.status === 'COMPLETED' ? '대화 완료' : '대화 중',
      timestamp: conversation.started_at,
    }),
  )

  return [...routineRecords, ...conversationRecords].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  )
}

export function dashboardMetrics(
  routines: readonly RoutineExecution[],
  conversations: readonly ConversationSummary[],
  personalState: PersonalState | null,
) {
  return [
    {
      label: '완료한 일정',
      value: routines.filter(({ state }) => state === 'CONFIRMED').length,
      unit: '건',
    },
    {
      label: '응답 없는 일정',
      value: routines.filter(({ state }) => state === 'NOT_ANSWERED').length,
      unit: '건',
    },
    {
      label: '기록한 대화',
      value: conversations.filter(({ status }) => status === 'COMPLETED').length,
      unit: '회',
    },
    {
      label: '현재 상태',
      value:
        personalState === null
          ? '정보 없음'
          : personalState.status === 'ANOMALOUS'
            ? '확인 필요'
            : '안정',
      unit: '',
    },
  ]
}

export function formatRecordDate(timestamp: string) {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return '시간 정보 없음'
  return dateTimeFormatter.format(parsed)
}
