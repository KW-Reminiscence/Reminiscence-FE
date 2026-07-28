let sharedAudioContext: AudioContext | null = null

export function getSpeechAudioContext() {
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext()
  }
  return sharedAudioContext
}

export function isSpeechAudioUnlocked() {
  return sharedAudioContext?.state === 'running'
}

export async function unlockSpeechAudio() {
  try {
    const context = getSpeechAudioContext()
    if (context.state !== 'running') {
      await context.resume()
    }
    if (context.state !== 'running') return false

    const silentBuffer = context.createBuffer(1, 1, context.sampleRate)
    const source = context.createBufferSource()
    source.buffer = silentBuffer
    source.connect(context.destination)
    source.onended = () => source.disconnect()
    source.start()
    return true
  } catch {
    return false
  }
}
