import { describe, expect, it } from 'vitest'
import type { RoutinePrompt } from '../../api/types'
import {
  formatServerDate,
  routinePageDefinition,
  routineSpeechKey,
} from './routineView'

const prompt: RoutinePrompt = {
  execution_id: 'morning-medication:2026-07-27',
  routine_id: 'morning-medication',
  name: '아침 약',
  category: 'MEDICATION',
  state: 'REMINDING',
  scheduled_at: '2026-07-27T09:00:00+09:00',
  reminder_count: 1,
  display_text: '아침 약 시간입니다. 마치신 뒤 기록 버튼을 눌러 주세요.',
  spoken_text: '아침 약 시간입니다. 마치신 뒤 기록 버튼을 눌러 주세요.',
  confirm_label: '아침 약 기록하기',
}

describe('routine view model', () => {
  it('uses backend presentation text without changing it', () => {
    expect(routinePageDefinition(prompt)).toMatchObject({
      title: prompt.display_text,
      actionLabel: prompt.confirm_label,
      tone: 'action',
    })
  })

  it('deduplicates speech by execution and reminder number', () => {
    expect(routineSpeechKey(prompt)).toBe(
      'morning-medication:2026-07-27:1',
    )
    expect(routineSpeechKey({ ...prompt, reminder_count: 2 })).not.toBe(
      routineSpeechKey(prompt),
    )
  })

  it('formats valid server timestamps in the server timezone', () => {
    expect(formatServerDate('2026-07-27T00:30:00+09:00')).toEqual({
      dateLabel: '2026년 7월 27일',
      dateTime: '2026-07-27',
    })
  })

  it('keeps invalid server timestamps renderable', () => {
    expect(formatServerDate('invalid')).toEqual({
      dateLabel: '날짜를 확인할 수 없어요',
      dateTime: '',
    })
  })
})
