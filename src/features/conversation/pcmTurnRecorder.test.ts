import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  calculateRms,
  PcmRecorderInitializationError,
  PcmTurnRecorder,
} from './pcmTurnRecorder'

class FakeAudioWorkletNode {
  port = { onmessage: null }
  connect() {}
  disconnect() {}
}

afterEach(() => vi.unstubAllGlobals())

describe('calculateRms', () => {
  it('returns zero for empty and silent audio', () => {
    expect(calculateRms(new Float32Array())).toBe(0)
    expect(calculateRms(new Float32Array([0, 0, 0]))).toBe(0)
  })

  it('measures signed audio samples without cancellation', () => {
    expect(calculateRms(new Float32Array([1, -1, 1, -1]))).toBe(1)
  })

  it('loads the recorder worklet from the same-origin public asset', async () => {
    const addModule = vi.fn().mockResolvedValue(undefined)
    const stop = vi.fn()
    const context = {
      state: 'running',
      sampleRate: 48_000,
      destination: {},
      audioWorklet: { addModule },
      createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
      createGain: () => ({
        gain: { value: 0 },
        connect() {},
        disconnect() {},
      }),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.stubGlobal('AudioContext', vi.fn(() => context))
    vi.stubGlobal('AudioWorkletNode', FakeAudioWorkletNode)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop }],
        }),
      },
    })
    const recorder = new PcmTurnRecorder({ onComplete: vi.fn() })

    await recorder.start()

    expect(addModule).toHaveBeenCalledWith('/pcm-capture-worklet.js')
    await recorder.cancel()
    expect(stop).toHaveBeenCalledOnce()
  })

  it('distinguishes recorder initialization failure from permission failure', async () => {
    const context = {
      state: 'running',
      audioWorklet: {
        addModule: vi.fn().mockRejectedValue(new DOMException('blocked', 'SecurityError')),
      },
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.stubGlobal('AudioContext', vi.fn(() => context))
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    })
    const recorder = new PcmTurnRecorder({ onComplete: vi.fn() })

    await expect(recorder.start()).rejects.toBeInstanceOf(
      PcmRecorderInitializationError,
    )
  })
})
