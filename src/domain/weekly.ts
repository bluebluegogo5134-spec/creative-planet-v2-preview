import { isDateInWeek } from './date'
import type { CreativeSession, WeeklySummary } from './model'

export const WEEKLY_NODE_GOAL = 4
export const WEEKLY_MINUTE_GOAL = 14 * 60

export function isCreativeSession(session: CreativeSession): boolean {
  return session.type !== '健身' && session.durationMinutes > 0
}

export function summarizeWeek(sessions: CreativeSession[], weekStart: string): WeeklySummary {
  const inWeek = sessions.filter((session) => isDateInWeek(session.dateKey, weekStart))
  const creative = inWeek.filter(isCreativeSession)
  const nodeDateKeys = [...new Set(creative.map((session) => session.dateKey))].sort()
  const creativeMinutes = creative.reduce(
    (total, session) => total + session.durationMinutes,
    0
  )
  const gymCount = inWeek.filter((session) => session.type === '健身').length

  return {
    nodeCount: nodeDateKeys.length,
    creativeMinutes,
    gymCount,
    passed: nodeDateKeys.length >= WEEKLY_NODE_GOAL && creativeMinutes >= WEEKLY_MINUTE_GOAL,
    nodeDateKeys
  }
}
