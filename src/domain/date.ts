export const APP_TIME_ZONE = 'Asia/Shanghai'

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export function toDateKey(timestamp: number): string {
  const parts = dateFormatter.formatToParts(new Date(timestamp))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function addDaysKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function getWeekStartFromDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`)
  const mondayOffset = (date.getUTCDay() + 6) % 7
  return addDaysKey(dateKey, -mondayOffset)
}

export function getWeekStart(timestamp: number): string {
  return getWeekStartFromDateKey(toDateKey(timestamp))
}

export function isDateInWeek(dateKey: string, weekStart: string): boolean {
  return dateKey >= weekStart && dateKey < addDaysKey(weekStart, 7)
}
