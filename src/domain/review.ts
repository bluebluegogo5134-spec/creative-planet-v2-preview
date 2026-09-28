import { addDaysKey, getWeekStartFromDateKey } from './date'
import type { CreativeSession } from './model'
import { CREATIVE_NODE_MINUTES, isCreativeSession, summarizeWeek } from './weekly'

export type ReviewPeriodKind = 'week' | 'month' | 'quarter' | 'half' | 'year'

export interface ReviewPeriod {
  kind: ReviewPeriodKind
  start: string
  end: string
  key: string
}

export interface PeriodSummary {
  nodeCount: number
  creativeMinutes: number
  gymCount: number
  connectionCount: number
  activeProjectCount: number
  nodeDateKeys: string[]
}

function monthEnd(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

export function getReviewPeriod(kind: ReviewPeriodKind, dateKey: string): ReviewPeriod {
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(5, 7))
  if (kind === 'week') {
    const start = getWeekStartFromDateKey(dateKey)
    return { kind, start, end: addDaysKey(start, 6), key: `week:${start}` }
  }
  if (kind === 'month') {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    return { kind, start, end: monthEnd(year, month), key: `month:${start.slice(0, 7)}` }
  }
  if (kind === 'quarter') {
    const firstMonth = Math.floor((month - 1) / 3) * 3 + 1
    const start = `${year}-${String(firstMonth).padStart(2, '0')}-01`
    return { kind, start, end: monthEnd(year, firstMonth + 2), key: `quarter:${year}-Q${Math.floor((month - 1) / 3) + 1}` }
  }
  if (kind === 'half') {
    const firstMonth = month <= 6 ? 1 : 7
    const start = `${year}-${String(firstMonth).padStart(2, '0')}-01`
    return { kind, start, end: monthEnd(year, firstMonth + 5), key: `half:${year}-H${month <= 6 ? 1 : 2}` }
  }
  return { kind, start: `${year}-01-01`, end: `${year}-12-31`, key: `year:${year}` }
}

export function automaticReviewKind(dateKey: string): ReviewPeriodKind {
  const month = Number(dateKey.slice(5, 7))
  const day = Number(dateKey.slice(8, 10))
  const year = Number(dateKey.slice(0, 4))
  if (month === 12 && day === 31) return 'year'
  if ((month === 6 || month === 12) && dateKey === monthEnd(year, month)) return 'half'
  if ([3, 6, 9, 12].includes(month) && dateKey === monthEnd(year, month)) return 'quarter'
  if (dateKey === monthEnd(year, month)) return 'month'
  return 'week'
}

export function sessionsInPeriod(sessions: CreativeSession[], period: ReviewPeriod): CreativeSession[] {
  return sessions.filter((session) => session.dateKey >= period.start && session.dateKey <= period.end)
}

export function summarizePeriod(sessions: CreativeSession[], period: ReviewPeriod): PeriodSummary {
  const inPeriod = sessionsInPeriod(sessions, period)
  const creative = inPeriod.filter(isCreativeSession)
  const minutesByDate = creative.reduce<Record<string, number>>((totals, session) => {
    totals[session.dateKey] = (totals[session.dateKey] ?? 0) + session.durationMinutes
    return totals
  }, {})
  const nodeDateKeys = Object.entries(minutesByDate)
    .filter(([, minutes]) => minutes >= CREATIVE_NODE_MINUTES)
    .map(([dateKey]) => dateKey)
    .sort()
  return {
    nodeCount: nodeDateKeys.length,
    creativeMinutes: creative.reduce((total, session) => total + session.durationMinutes, 0),
    gymCount: inPeriod.filter((session) => session.type === '健身').length,
    connectionCount: creative.length,
    activeProjectCount: new Set(creative.map((session) => session.projectId).filter(Boolean)).size,
    nodeDateKeys
  }
}

export function passingWeekStreak(sessions: CreativeSession[], currentWeek: string): number {
  let week = summarizeWeek(sessions, currentWeek).passed ? currentWeek : addDaysKey(currentWeek, -7)
  let streak = 0
  while (summarizeWeek(sessions, week).passed) {
    streak += 1
    week = addDaysKey(week, -7)
  }
  return streak
}

export function longestPassingWeekStreak(sessions: CreativeSession[]): number {
  if (!sessions.length) return 0
  const weeks = [...new Set(sessions.map((session) => getWeekStartFromDateKey(session.dateKey)))].sort()
  if (!weeks.length) return 0
  let longest = 0
  let running = 0
  for (let week = weeks[0]; week <= weeks[weeks.length - 1]; week = addDaysKey(week, 7)) {
    running = summarizeWeek(sessions, week).passed ? running + 1 : 0
    longest = Math.max(longest, running)
  }
  return longest
}
