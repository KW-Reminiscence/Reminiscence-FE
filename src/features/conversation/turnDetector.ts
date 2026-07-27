export type TurnPhase =
  | 'waiting-for-speech'
  | 'speaking'
  | 'silence'
  | 'complete'

export type TurnEndReason = 'silence' | 'no-response' | 'max-duration' | 'manual'

export interface TurnDetectorConfig {
  initialSilenceMs: number
  endSilenceMs: number
  maxDurationMs: number
}

export interface TurnProgress {
  phase: TurnPhase
  elapsedMs: number
  silenceMs: number
  hasSpeech: boolean
  endReason: TurnEndReason | null
}

export const defaultTurnDetectorConfig: TurnDetectorConfig = {
  initialSilenceMs: 15_000,
  endSilenceMs: 5_000,
  maxDurationMs: 60_000,
}

export class TurnDetector {
  private readonly config: TurnDetectorConfig
  private startedAt: number | null = null
  private lastSpeechAt: number | null = null
  private completedReason: TurnEndReason | null = null

  constructor(config: Partial<TurnDetectorConfig> = {}) {
    this.config = { ...defaultTurnDetectorConfig, ...config }
  }

  update(nowMs: number, speechDetected: boolean): TurnProgress {
    if (this.startedAt === null) this.startedAt = nowMs

    const elapsedMs = Math.max(0, nowMs - this.startedAt)
    if (this.completedReason) {
      return this.progress(elapsedMs)
    }

    if (speechDetected) {
      this.lastSpeechAt = nowMs
    }

    if (elapsedMs >= this.config.maxDurationMs) {
      this.completedReason = 'max-duration'
    } else if (
      this.lastSpeechAt === null &&
      elapsedMs >= this.config.initialSilenceMs
    ) {
      this.completedReason = 'no-response'
    } else if (
      this.lastSpeechAt !== null &&
      nowMs - this.lastSpeechAt >= this.config.endSilenceMs
    ) {
      this.completedReason = 'silence'
    }

    return this.progress(elapsedMs)
  }

  completeManually(nowMs: number): TurnProgress {
    if (this.startedAt === null) this.startedAt = nowMs
    this.completedReason ??= 'manual'
    return this.progress(Math.max(0, nowMs - this.startedAt))
  }

  private progress(elapsedMs: number): TurnProgress {
    const silenceMs =
      this.lastSpeechAt === null
        ? elapsedMs
        : Math.max(0, elapsedMs - this.lastSpeechAt)

    let phase: TurnPhase = 'waiting-for-speech'
    if (this.completedReason) phase = 'complete'
    else if (this.lastSpeechAt !== null) {
      phase = silenceMs > 0 ? 'silence' : 'speaking'
    }

    return {
      phase,
      elapsedMs,
      silenceMs,
      hasSpeech: this.lastSpeechAt !== null,
      endReason: this.completedReason,
    }
  }
}
