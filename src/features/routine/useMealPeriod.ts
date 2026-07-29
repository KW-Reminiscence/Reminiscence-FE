import { useEffect, useState } from 'react'
import {
  mealPeriodAt,
  millisecondsUntilNextMealPeriod,
} from './mealPeriod'

export function useMealPeriod() {
  const [period, setPeriod] = useState(mealPeriodAt)

  useEffect(() => {
    let timer: number | undefined

    const scheduleUpdate = () => {
      window.clearTimeout(timer)
      const now = new Date()
      setPeriod(mealPeriodAt(now))
      timer = window.setTimeout(
        scheduleUpdate,
        millisecondsUntilNextMealPeriod(now) + 100,
      )
    }

    scheduleUpdate()
    window.addEventListener('focus', scheduleUpdate)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', scheduleUpdate)
    }
  }, [])

  return period
}
