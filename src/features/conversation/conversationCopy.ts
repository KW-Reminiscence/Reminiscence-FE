import type { TurnProgress } from './turnDetector'

export function listeningDescription(progress: TurnProgress | null) {
  const elapsedMs = progress?.elapsedMs ?? 0
  const silenceMs = progress?.silenceMs ?? 0
  const hasSpeech = progress?.hasSpeech ?? false

  if (!hasSpeech) {
    const seconds = Math.max(1, Math.ceil((15_000 - elapsedMs) / 1_000))
    return `말씀을 시작해주세요. ${seconds}초 동안 기다릴게요.`
  }
  if (progress?.phase === 'silence') {
    const seconds = Math.max(1, Math.ceil((5_000 - silenceMs) / 1_000))
    return `계속 듣고 있어요. ${seconds}초 동안 말씀이 없으면 다음 질문으로 넘어가요.`
  }
  return '5초 동안 조용하면 다음 질문으로 넘어가요. 주변이 시끄러우면 아래 버튼을 눌러주세요.'
}
