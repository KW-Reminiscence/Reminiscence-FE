import { useEffect, useState } from 'react'
import { formatServerDate } from './routineView'

const seoulOffsetMs = 9 * 60 * 60 * 1_000
const lunarDateFormatter = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export interface DemoDate {
  dateLabel: string
  dateTime: string
  secondaryDateLabel: string | null
}

export function formatDemoDate(date = new Date()): DemoDate {
  if (Number.isNaN(date.getTime())) {
    return {
      ...formatServerDate('invalid'),
      secondaryDateLabel: null,
    }
  }

  const lunarParts = Object.fromEntries(
    lunarDateFormatter
      .formatToParts(date)
      .filter(({ type }) => ['relatedYear', 'month', 'day'].includes(type))
      .map(({ type, value }) => [type, value]),
  )
  const secondaryDateLabel =
    lunarParts.relatedYear && lunarParts.month && lunarParts.day
      ? `음력 ${lunarParts.relatedYear}년 ${lunarParts.month} ${lunarParts.day}일`
      : null

  return {
    ...formatServerDate(date.toISOString()),
    secondaryDateLabel,
  }
}

function millisecondsUntilNextSeoulDay(date: Date) {
  const shifted = new Date(date.getTime() + seoulOffsetMs)
  const nextMidnight =
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() + 1,
    ) - seoulOffsetMs

  return Math.max(0, nextMidnight - date.getTime())
}

export function useDemoDate() {
  const [demoDate, setDemoDate] = useState(formatDemoDate)

  useEffect(() => {
    let timer: number | undefined

    const scheduleUpdate = () => {
      window.clearTimeout(timer)
      const now = new Date()
      setDemoDate(formatDemoDate(now))
      timer = window.setTimeout(
        scheduleUpdate,
        millisecondsUntilNextSeoulDay(now) + 100,
      )
    }

    scheduleUpdate()
    window.addEventListener('focus', scheduleUpdate)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', scheduleUpdate)
    }
  }, [])

  return demoDate
}
