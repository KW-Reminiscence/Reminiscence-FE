import type {
  ConversationSummary,
  DomainEvaluation,
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

const monthKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
})

export function buildDashboardRecords(
  routines: readonly RoutineExecution[],
  conversations: readonly ConversationSummary[],
) {
  const routineRecords: DashboardRecord[] = routines.map((routine) => ({
    id: `routine:${routine.execution_id}`,
    kind: 'routine',
    title: routine.name,
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

function monthKey(timestamp: string | Date) {
  const parsed = timestamp instanceof Date ? timestamp : new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return null
  const parts = Object.fromEntries(
    monthKeyFormatter
      .formatToParts(parsed)
      .filter(({ type }) => type === 'year' || type === 'month')
      .map(({ type, value }) => [type, value]),
  )
  return `${parts.year}-${parts.month}`
}

export function filterDashboardMonth(
  routines: readonly RoutineExecution[],
  conversations: readonly ConversationSummary[],
  referenceDate = new Date(),
) {
  const target = monthKey(referenceDate)
  return {
    routines: routines.filter(({ scheduled_at }) => monthKey(scheduled_at) === target),
    conversations: conversations.filter(
      ({ started_at }) => monthKey(started_at) === target,
    ),
  }
}

export function anomalyEvidence(label: string, evaluation: DomainEvaluation) {
  const signals = [
    ['규칙', evaluation.rule_based_signal],
    ['Isolation Forest', evaluation.isolation_forest_signal],
    ['지속성', evaluation.persistence_signal],
  ] as const
  return {
    label,
    statusLabel: evaluation.status === 'ANOMALOUS' ? '확인 필요' : '안정',
    modeLabel:
      evaluation.mode === 'ISOLATION_FOREST'
        ? '개인 기준선 분석'
        : evaluation.mode === 'COLD_START'
          ? '초기 규칙 분석'
          : '관측 데이터 수집 중',
    signals: signals.filter(([, active]) => active).map(([name]) => name),
    reasons: evaluation.reasons,
    observationKey: evaluation.observation_key,
  }
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
