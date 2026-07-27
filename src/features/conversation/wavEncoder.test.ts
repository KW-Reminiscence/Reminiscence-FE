import { describe, expect, it } from 'vitest'
import {
  encodePcm16Wav,
  mergeFloat32Chunks,
  resampleLinear,
} from './wavEncoder'

describe('WAV encoding', () => {
  it('merges captured chunks in order', () => {
    expect(
      Array.from(
        mergeFloat32Chunks([
          new Float32Array([0, 0.25]),
          new Float32Array([-0.5]),
        ]),
      ),
    ).toEqual([0, 0.25, -0.5])
  })

  it('resamples input to the target sample count', () => {
    const source = new Float32Array(48_000)
    const result = resampleLinear(source, 48_000, 16_000)

    expect(result).toHaveLength(16_000)
  })

  it('writes a mono 16-bit PCM WAV header and clamps samples', () => {
    const wav = encodePcm16Wav(new Float32Array([-2, 0, 2]), 16_000)
    const view = new DataView(wav)
    const ascii = (offset: number, length: number) =>
      String.fromCharCode(
        ...new Uint8Array(wav.slice(offset, offset + length)),
      )

    expect(ascii(0, 4)).toBe('RIFF')
    expect(ascii(8, 4)).toBe('WAVE')
    expect(ascii(36, 4)).toBe('data')
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16_000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(6)
    expect(view.getInt16(44, true)).toBe(-32_768)
    expect(view.getInt16(46, true)).toBe(0)
    expect(view.getInt16(48, true)).toBe(32_767)
  })

  it('rejects invalid sample rates', () => {
    expect(() => encodePcm16Wav(new Float32Array(), 0)).toThrow(RangeError)
    expect(() =>
      resampleLinear(new Float32Array([0]), 48_000, -1),
    ).toThrow(RangeError)
  })
})
