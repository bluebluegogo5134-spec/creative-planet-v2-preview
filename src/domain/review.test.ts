import { describe, expect, it } from 'vitest'
import type { CreativeSession } from './model'
import { automaticReviewKind, getReviewPeriod, passingWeekStreak, summarizePeriod } from './review'

function session(dateKey: string, minutes = 210, type: CreativeSession['type'] = '写作'): CreativeSession {
  return { id: `${dateKey}-${type}-${minutes}-${Math.random()}`, projectId: 'p1', type, goal: '', done: '', nextAction: '', mood: '', startedAt: 0, endedAt: 0, durationMinutes: minutes, dateKey, weekStart: '', source: 'manual', createdAt: 0, updatedAt: 0 }
}

describe('review periods and streaks', () => {
  it('keeps the previous achieved-week streak while the current week is unfinished', () => {
    const sessions = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17']
      .map((date) => session(date))
    expect(passingWeekStreak(sessions, '2026-09-21')).toBe(2)
  })

  it('chooses the longest ending period on boundary dates', () => {
    expect(automaticReviewKind('2026-09-30')).toBe('quarter')
    expect(automaticReviewKind('2026-06-30')).toBe('half')
    expect(automaticReviewKind('2026-12-31')).toBe('year')
    expect(automaticReviewKind('2026-09-28')).toBe('week')
  })

  it('aggregates every current activity instead of a cached category list', () => {
    const period = getReviewPeriod('month', '2026-09-28')
    const summary = summarizePeriod([session('2026-09-12', 60, '写作'), session('2026-09-28', 45, '采访')], period)
    expect(summary.connectionCount).toBe(2)
    expect(summary.creativeMinutes).toBe(105)
    expect(summary.nodeCount).toBe(2)
  })
})
