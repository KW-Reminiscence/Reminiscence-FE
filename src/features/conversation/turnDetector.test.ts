import { describe, expect, it } from 'vitest'
import { TurnDetector } from './turnDetector'

describe('TurnDetector', () => {
  it('ends only after five continuous seconds of silence', () => {
    const detector = new TurnDetector()

    detector.update(0, false)
    detector.update(1_000, true)
    expect(detector.update(5_900, false)).toMatchObject({
      phase: 'silence',
      silenceMs: 4_900,
      endReason: null,
    })
    expect(detector.update(6_000, false)).toMatchObject({
      phase: 'complete',
      silenceMs: 5_000,
      endReason: 'silence',
    })
  })

  it('resets the silence timer when speech resumes before five seconds', () => {
    const detector = new TurnDetector()

    detector.update(0, true)
    detector.update(4_900, false)
    detector.update(4_950, true)

    expect(detector.update(9_900, false).endReason).toBeNull()
    expect(detector.update(9_950, false).endReason).toBe('silence')
  })

  it('ends a turn after fifteen seconds when speech never starts', () => {
    const detector = new TurnDetector()

    detector.update(0, false)
    expect(detector.update(14_999, false).endReason).toBeNull()
    expect(detector.update(15_000, false).endReason).toBe('no-response')
  })

  it('enforces the maximum duration even while speech continues', () => {
    const detector = new TurnDetector()

    detector.update(0, true)
    expect(detector.update(59_999, true).endReason).toBeNull()
    expect(detector.update(60_000, true).endReason).toBe('max-duration')
  })

  it('keeps the first completion reason', () => {
    const detector = new TurnDetector()

    detector.update(0, true)
    expect(detector.completeManually(2_000).endReason).toBe('manual')
    expect(detector.update(70_000, false).endReason).toBe('manual')
  })
})
