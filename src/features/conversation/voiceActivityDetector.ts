export interface VoiceActivityDetectorConfig {
  minimumSpeechMs: number
  minimumEntryRms: number
  minimumExitRms: number
  noiseEntryMultiplier: number
  noiseExitMultiplier: number
  initialNoiseFloorRms: number
  noiseFloorSmoothing: number
}

const defaultConfig: VoiceActivityDetectorConfig = {
  minimumSpeechMs: 120,
  minimumEntryRms: 0.03,
  minimumExitRms: 0.02,
  noiseEntryMultiplier: 1.8,
  noiseExitMultiplier: 1.35,
  initialNoiseFloorRms: 0.015,
  noiseFloorSmoothing: 0.04,
}

export class VoiceActivityDetector {
  private readonly config: VoiceActivityDetectorConfig
  private noiseFloorRms: number
  private speechCandidateMs = 0
  private speaking = false

  constructor(config: Partial<VoiceActivityDetectorConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.noiseFloorRms = this.config.initialNoiseFloorRms
  }

  update(rms: number, frameDurationMs: number) {
    const normalizedRms = Number.isFinite(rms) ? Math.max(0, rms) : 0
    const normalizedDuration = Number.isFinite(frameDurationMs)
      ? Math.max(0, frameDurationMs)
      : 0
    const entryThreshold = Math.max(
      this.config.minimumEntryRms,
      this.noiseFloorRms * this.config.noiseEntryMultiplier,
    )
    const exitThreshold = Math.max(
      this.config.minimumExitRms,
      this.noiseFloorRms * this.config.noiseExitMultiplier,
    )

    if (this.speaking) {
      if (normalizedRms >= exitThreshold) return true
      this.speaking = false
      this.speechCandidateMs = 0
      this.updateNoiseFloor(normalizedRms)
      return false
    }

    if (normalizedRms >= entryThreshold) {
      this.speechCandidateMs += normalizedDuration
      if (this.speechCandidateMs >= this.config.minimumSpeechMs) {
        this.speaking = true
        this.speechCandidateMs = 0
        return true
      }
      return false
    }

    this.speechCandidateMs = 0
    this.updateNoiseFloor(normalizedRms)
    return false
  }

  private updateNoiseFloor(rms: number) {
    this.noiseFloorRms +=
      (rms - this.noiseFloorRms) * this.config.noiseFloorSmoothing
  }
}
