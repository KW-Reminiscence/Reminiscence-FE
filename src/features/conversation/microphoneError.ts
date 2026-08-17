import { PcmRecorderInitializationError } from './pcmTurnRecorder'

export function microphoneErrorMessage(error: unknown) {
  if (error instanceof PcmRecorderInitializationError) {
    return '마이크는 연결됐지만 녹음을 시작하지 못했어요. 브라우저를 새로고침한 뒤 다시 시도해주세요.'
  }
  if (error instanceof DOMException) {
    if (error.name === 'NotFoundError') {
      return '사용할 수 있는 마이크를 찾지 못했어요. 기기 연결을 확인해주세요.'
    }
    if (error.name === 'NotReadableError') {
      return '다른 앱이 마이크를 사용 중이에요. 다른 앱을 닫고 다시 시도해주세요.'
    }
  }
  return '마이크를 연결하지 못했어요. 브라우저의 마이크 권한을 확인해주세요.'
}
