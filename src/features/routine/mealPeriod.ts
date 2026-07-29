export type MealPeriod = 'MORNING' | 'LUNCH'

const seoulOffsetMs = 9 * 60 * 60 * 1_000

function seoulDate(date: Date) {
  return new Date(date.getTime() + seoulOffsetMs)
}

export function mealPeriodAt(date = new Date()): MealPeriod {
  return seoulDate(date).getUTCHours() >= 12 ? 'LUNCH' : 'MORNING'
}

export function millisecondsUntilNextMealPeriod(date = new Date()) {
  const shifted = seoulDate(date)
  const year = shifted.getUTCFullYear()
  const month = shifted.getUTCMonth()
  const day = shifted.getUTCDate()
  const hour = shifted.getUTCHours()
  const nextBoundary = hour < 12
    ? Date.UTC(year, month, day, 12) - seoulOffsetMs
    : Date.UTC(year, month, day + 1) - seoulOffsetMs

  return Math.max(0, nextBoundary - date.getTime())
}
