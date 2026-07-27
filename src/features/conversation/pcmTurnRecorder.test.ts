import { describe, expect, it } from 'vitest'
import { calculateRms } from './pcmTurnRecorder'

describe('calculateRms', () => {
  it('returns zero for empty and silent audio', () => {
    expect(calculateRms(new Float32Array())).toBe(0)
    expect(calculateRms(new Float32Array([0, 0, 0]))).toBe(0)
  })

  it('measures signed audio samples without cancellation', () => {
    expect(calculateRms(new Float32Array([1, -1, 1, -1]))).toBe(1)
  })
})
