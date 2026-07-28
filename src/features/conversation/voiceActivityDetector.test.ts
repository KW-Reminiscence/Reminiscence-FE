import { describe, expect, it } from 'vitest'
import { VoiceActivityDetector } from './voiceActivityDetector'

describe('VoiceActivityDetector', () => {
  it('treats steady moderate background noise as silence', () => {
    const detector = new VoiceActivityDetector()

    for (let elapsed = 0; elapsed < 10_000; elapsed += 20) {
      expect(detector.update(0.022, 20)).toBe(false)
    }
  })

  it('ignores short noise spikes that do not sustain speech', () => {
    const detector = new VoiceActivityDetector()

    expect(detector.update(0.08, 40)).toBe(false)
    expect(detector.update(0.08, 40)).toBe(false)
    expect(detector.update(0.01, 40)).toBe(false)
  })

  it('recognizes sustained speech and releases on quieter input', () => {
    const detector = new VoiceActivityDetector()

    expect(detector.update(0.08, 40)).toBe(false)
    expect(detector.update(0.08, 40)).toBe(false)
    expect(detector.update(0.08, 40)).toBe(true)
    expect(detector.update(0.04, 40)).toBe(true)
    expect(detector.update(0.01, 40)).toBe(false)
  })

  it('safely handles invalid measurement values', () => {
    const detector = new VoiceActivityDetector()

    expect(detector.update(Number.NaN, Number.NaN)).toBe(false)
    expect(detector.update(Number.POSITIVE_INFINITY, -10)).toBe(false)
  })
})
