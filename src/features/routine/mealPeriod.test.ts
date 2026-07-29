import { describe, expect, it } from 'vitest'
import {
  mealPeriodAt,
  millisecondsUntilNextMealPeriod,
} from './mealPeriod'

describe('mealPeriodAt', () => {
  it('uses the morning copy until noon in Seoul', () => {
    expect(mealPeriodAt(new Date('2026-07-29T02:59:59.999Z'))).toBe(
      'MORNING',
    )
  })

  it('uses the lunch copy from noon through the end of the Seoul day', () => {
    expect(mealPeriodAt(new Date('2026-07-29T03:00:00.000Z'))).toBe('LUNCH')
    expect(mealPeriodAt(new Date('2026-07-29T14:59:59.999Z'))).toBe('LUNCH')
  })

  it('returns to the morning copy at Seoul midnight', () => {
    expect(mealPeriodAt(new Date('2026-07-29T15:00:00.000Z'))).toBe(
      'MORNING',
    )
  })
})

describe('millisecondsUntilNextMealPeriod', () => {
  it('targets noon while the morning copy is active', () => {
    expect(
      millisecondsUntilNextMealPeriod(
        new Date('2026-07-29T02:59:59.000Z'),
      ),
    ).toBe(1_000)
  })

  it('targets midnight while the lunch copy is active', () => {
    expect(
      millisecondsUntilNextMealPeriod(
        new Date('2026-07-29T14:59:59.000Z'),
      ),
    ).toBe(1_000)
  })
})
