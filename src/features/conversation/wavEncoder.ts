const WAV_HEADER_BYTES = 44
const PCM_BYTES_PER_SAMPLE = 2

export function mergeFloat32Chunks(chunks: readonly Float32Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const merged = new Float32Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  return merged
}

export function resampleLinear(
  samples: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
) {
  if (inputSampleRate === outputSampleRate || samples.length === 0) {
    return samples.slice()
  }
  if (inputSampleRate <= 0 || outputSampleRate <= 0) {
    throw new RangeError('sample rates must be positive')
  }

  const outputLength = Math.max(
    1,
    Math.round((samples.length * outputSampleRate) / inputSampleRate),
  )
  const output = new Float32Array(outputLength)
  const ratio = inputSampleRate / outputSampleRate

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = index * ratio
    const leftIndex = Math.min(Math.floor(sourcePosition), samples.length - 1)
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1)
    const fraction = sourcePosition - leftIndex
    output[index] =
      samples[leftIndex] +
      (samples[rightIndex] - samples[leftIndex]) * fraction
  }

  return output
}

export function encodePcm16Wav(samples: Float32Array, sampleRate: number) {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new RangeError('sample rate must be a positive integer')
  }

  const buffer = new ArrayBuffer(
    WAV_HEADER_BYTES + samples.length * PCM_BYTES_PER_SAMPLE,
  )
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * PCM_BYTES_PER_SAMPLE, true)
  view.setUint16(32, PCM_BYTES_PER_SAMPLE, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, samples.length * PCM_BYTES_PER_SAMPLE, true)

  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]))
    const pcm = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    view.setInt16(WAV_HEADER_BYTES + index * PCM_BYTES_PER_SAMPLE, pcm, true)
  }

  return buffer
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}
