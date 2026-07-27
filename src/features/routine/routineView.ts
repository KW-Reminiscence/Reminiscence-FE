import type { RoutinePrompt } from '../../api/types'
import type { CarePageDefinition } from '../../pages/carePages'

const koreanDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

export function formatServerDate(serverTime: string) {
  const parsed = new Date(serverTime)
  if (Number.isNaN(parsed.getTime())) {
    return { dateLabel: '날짜를 확인할 수 없어요', dateTime: '' }
  }

  const parts = Object.fromEntries(
    koreanDateFormatter
      .formatToParts(parsed)
      .filter(({ type }) => ['year', 'month', 'day'].includes(type))
      .map(({ type, value }) => [type, value]),
  )

  return {
    dateLabel: `${parts.year}년 ${parts.month}월 ${parts.day}일`,
    dateTime: `${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}`,
  }
}

export function routinePageDefinition(prompt: RoutinePrompt): CarePageDefinition {
  const fallbackDescription =
    prompt.category === 'MEDICATION'
      ? '약을 드신 뒤 아래 버튼을 눌러주세요'
      : '식사를 마친 뒤 아래 버튼을 눌러주세요'

  return {
    path: `/routine/${encodeURIComponent(prompt.execution_id)}`,
    navLabel: prompt.name,
    title: prompt.display_text,
    description: fallbackDescription,
    actionLabel: prompt.confirm_label,
    tone: 'action',
  }
}

export function routineSpeechKey(prompt: RoutinePrompt) {
  return `${prompt.execution_id}:${prompt.reminder_count}`
}
