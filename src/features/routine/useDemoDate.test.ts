import { describe, expect, it } from 'vitest'
import { formatDemoDate } from './useDemoDate'

describe('formatDemoDate', () => {
  it('uses the Seoul calendar date across the UTC day boundary', () => {
    expect(formatDemoDate(new Date('2026-08-16T14:59:59.999Z'))).toMatchObject({
      dateLabel: '2026년 8월 16일',
      dateTime: '2026-08-16',
    })
    expect(formatDemoDate(new Date('2026-08-16T15:00:00.000Z'))).toEqual({
      dateLabel: '2026년 8월 17일',
      dateTime: '2026-08-17',
      secondaryDateLabel: '음력 2026년 7월 5일',
    })
  })

  it('fails closed when given an invalid date', () => {
    expect(formatDemoDate(new Date('invalid'))).toEqual({
      dateLabel: '날짜를 확인할 수 없어요',
      dateTime: '',
      secondaryDateLabel: null,
    })
  })
})
