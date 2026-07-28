import {
  TurnDetector,
  type TurnEndReason,
  type TurnProgress,
} from './turnDetector'
import {
  encodePcm16Wav,
  mergeFloat32Chunks,
  resampleLinear,
} from './wavEncoder'
import { VoiceActivityDetector } from './voiceActivityDetector'

const TARGET_SAMPLE_RATE = 16_000
const PROGRESS_INTERVAL_MS = 100

const workletSource = `
class ReminiscencePcmCapture extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0]
    if (input) this.port.postMessage(input.slice())
    return true
  }
}
registerProcessor('reminiscence-pcm-capture', ReminiscencePcmCapture)
`

export interface CapturedTurn {
  wav: Blob
  durationSeconds: number
  hasSpeech: boolean
  endReason: TurnEndReason
}

interface PcmTurnRecorderOptions {
  onProgress?: (progress: TurnProgress) => void
  onComplete: (turn: CapturedTurn) => void | Promise<void>
}

export function calculateRms(samples: Float32Array) {
  if (samples.length === 0) return 0

  let sumOfSquares = 0
  for (const sample of samples) {
    sumOfSquares += sample * sample
  }
  return Math.sqrt(sumOfSquares / samples.length)
}

export class PcmTurnRecorder {
  private readonly detector = new TurnDetector()
  private readonly voiceActivity = new VoiceActivityDetector()
  private readonly chunks: Float32Array[] = []
  private readonly options: PcmTurnRecorderOptions
  private context: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private worklet: AudioWorkletNode | null = null
  private silentGain: GainNode | null = null
  private stream: MediaStream | null = null
  private lastProgressAt = 0
  private finishing = false
  private startedAt = 0

  constructor(options: PcmTurnRecorderOptions) {
    this.options = options
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('이 기기에서는 마이크를 사용할 수 없습니다.')
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    if (this.finishing) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
      return
    }

    try {
      this.context = new AudioContext()
      await this.installWorklet(this.context)
      await this.context.resume()

      this.source = this.context.createMediaStreamSource(this.stream)
      this.worklet = new AudioWorkletNode(
        this.context,
        'reminiscence-pcm-capture',
      )
      this.silentGain = this.context.createGain()
      this.silentGain.gain.value = 0

      this.source.connect(this.worklet)
      this.worklet.connect(this.silentGain)
      this.silentGain.connect(this.context.destination)

      this.startedAt = performance.now()
      const progress = this.detector.update(this.startedAt, false)
      this.options.onProgress?.(progress)

      this.worklet.port.onmessage = (
        event: MessageEvent<Float32Array>,
      ) => {
        this.handleSamples(event.data)
      }
    } catch (error) {
      await this.releaseResources()
      throw error
    }
  }

  async stop() {
    if (this.finishing) return
    const progress = this.detector.completeManually(performance.now())
    await this.finish(progress)
  }

  async cancel() {
    if (this.finishing) return
    this.finishing = true
    await this.releaseResources()
  }

  private handleSamples(samples: Float32Array) {
    if (this.finishing) return

    this.chunks.push(samples.slice())
    const now = performance.now()
    const sampleRate = this.context?.sampleRate ?? TARGET_SAMPLE_RATE
    const frameDurationMs = (samples.length / sampleRate) * 1_000
    const speechDetected = this.voiceActivity.update(
      calculateRms(samples),
      frameDurationMs,
    )
    const progress = this.detector.update(now, speechDetected)

    if (
      progress.endReason ||
      now - this.lastProgressAt >= PROGRESS_INTERVAL_MS
    ) {
      this.lastProgressAt = now
      this.options.onProgress?.(progress)
    }

    if (progress.endReason) void this.finish(progress)
  }

  private async finish(progress: TurnProgress) {
    if (this.finishing || !progress.endReason) return
    this.finishing = true

    const inputSampleRate = this.context?.sampleRate ?? TARGET_SAMPLE_RATE
    await this.releaseResources()

    const merged = mergeFloat32Chunks(this.chunks)
    const samples = resampleLinear(
      merged,
      inputSampleRate,
      TARGET_SAMPLE_RATE,
    )
    const wavBuffer = encodePcm16Wav(samples, TARGET_SAMPLE_RATE)
    const elapsedMs =
      progress.elapsedMs || performance.now() - this.startedAt
    const durationSeconds = Math.max(
      0,
      Math.min(60, elapsedMs / 1_000),
    )

    await this.options.onComplete({
      wav: new Blob([wavBuffer], { type: 'audio/wav' }),
      durationSeconds,
      hasSpeech: progress.hasSpeech,
      endReason: progress.endReason,
    })
  }

  private async installWorklet(context: AudioContext) {
    const moduleUrl = URL.createObjectURL(
      new Blob([workletSource], { type: 'text/javascript' }),
    )
    try {
      await context.audioWorklet.addModule(moduleUrl)
    } finally {
      URL.revokeObjectURL(moduleUrl)
    }
  }

  private async releaseResources() {
    if (this.worklet) {
      this.worklet.port.onmessage = null
      this.worklet.disconnect()
    }
    this.source?.disconnect()
    this.silentGain?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())

    if (this.context && this.context.state !== 'closed') {
      await this.context.close()
    }

    this.worklet = null
    this.source = null
    this.silentGain = null
    this.stream = null
    this.context = null
  }
}
