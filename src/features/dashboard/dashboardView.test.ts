import { describe, expect, it } from 'vitest'
import type {
  ConversationSummary,
  RoutineExecution,
} from '../../api/types'
import {
  buildDashboardRecords,
  dashboardMetrics,
  filterDashboardMonth,
  formatRecordDate,
} from './dashboardView'

const routine: RoutineExecution = {
  execution_id: 'morning-medication:2026-07-27',
  routine_id: 'morning-medication',
  name: '아침 약',
  state: 'CONFIRMED',
  scheduled_at: '2026-07-27T09:00:00+09:00',
  reminder_count: 1,
  confirmed_at: '2026-07-27T09:03:00+09:00',
  confirmation_delay_seconds: 180,
  closed_at: '2026-07-27T09:03:00+09:00',
}

const conversation: ConversationSummary = {
  session_id: 'session-1',
  status: 'COMPLETED',
  started_at: '2026-07-27T14:00:00+09:00',
  completed_at: '2026-07-27T14:10:00+09:00',
  completion_reason: 'USER_FINISHED',
  user_turn_count: 3,
  total_utterance_chars: 120,
  average_utterance_chars: 40,
  average_turn_duration_seconds: 12,
  no_response_count: 0,
}

describe('dashboard view model', () => {
  it('combines records newest first', () => {
    const records = buildDashboardRecords([routine], [conversation])

    expect(records.map(({ kind }) => kind)).toEqual([
      'conversation',
      'routine',
    ])
    expect(records[0]).toMatchObject({
      title: '대화 3회 기록',
      statusLabel: '대화 완료',
    })
    expect(records[1].title).toBe('아침 약')
  })

  it('counts only matching completion states', () => {
    const metrics = dashboardMetrics(
      [
        routine,
        {
          ...routine,
          execution_id: 'lunch:2026-07-27',
          state: 'NOT_ANSWERED',
        },
      ],
      [conversation],
      null,
    )

    expect(metrics.map(({ value }) => value)).toEqual([
      1,
      1,
      1,
      '정보 없음',
    ])
  })

  it('keeps invalid dates readable', () => {
    expect(formatRecordDate('not-a-date')).toBe('시간 정보 없음')
  })

  it('filters month boundaries in Asia/Seoul', () => {
    const septemberRoutine = {
      ...routine,
      scheduled_at: '2026-08-31T16:00:00Z',
    }
    const augustConversation = {
      ...conversation,
      started_at: '2026-08-31T14:59:59Z',
    }

    const result = filterDashboardMonth(
      [septemberRoutine],
      [augustConversation],
      new Date('2026-09-15T00:00:00+09:00'),
    )

    expect(result.routines).toEqual([septemberRoutine])
    expect(result.conversations).toEqual([])
  })
})
