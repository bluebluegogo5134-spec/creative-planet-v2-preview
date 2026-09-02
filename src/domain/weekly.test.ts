import { describe, expect, it } from 'vitest'
import type { CreativeSession } from './model'
import { summarizeWeek } from './weekly'

function session(
  id: string,
  dateKey: string,
  minutes: number,
  type: CreativeSession['type'] = '写作'
): CreativeSession {
  return {
    id,
    projectId: type === '健身' ? null : 'p1',
    type,
    goal: '',
    done: '',
    nextAction: '',
    mood: '',
    startedAt: 0,
    endedAt: 0,
    durationMinutes: minutes,
    dateKey,
    weekStart: '2026-08-24',
    source: 'manual',
    createdAt: 0,
    updatedAt: 0
  }
}

describe('weekly summary', () => {
  it('counts one node per day after creative time reaches thirty minutes', () => {
    const result = summarizeWeek(
      [
        session('1', '2026-08-24', 60),
        session('2', '2026-08-24', 30, '研究'),
        session('3', '2026-08-26', 90),
        session('4', '2026-08-28', 45)
      ],
      '2026-08-24'
    )

    expect(result.nodeCount).toBe(3)
    expect(result.creativeMinutes).toBe(225)
    expect(result.nodeDateKeys).toEqual(['2026-08-24', '2026-08-26', '2026-08-28'])
  })

  it('accumulates short sessions on the same day before lighting a node', () => {
    const result = summarizeWeek(
      [
        session('1', '2026-08-24', 12),
        session('2', '2026-08-24', 18, '研究'),
        session('3', '2026-08-25', 29)
      ],
      '2026-08-24'
    )

    expect(result.nodeCount).toBe(1)
    expect(result.nodeDateKeys).toEqual(['2026-08-24'])
    expect(result.creativeMinutes).toBe(59)
  })

  it('keeps gym activity separate from creation', () => {
    const result = summarizeWeek(
      [session('1', '2026-08-24', 60), session('2', '2026-08-25', 90, '健身')],
      '2026-08-24'
    )
    expect(result.nodeCount).toBe(1)
    expect(result.creativeMinutes).toBe(60)
    expect(result.gymCount).toBe(1)
  })

  it('requires both four nodes and fourteen hours', () => {
    const result = summarizeWeek(
      [
        session('1', '2026-08-24', 210),
        session('2', '2026-08-25', 210),
        session('3', '2026-08-26', 210),
        session('4', '2026-08-27', 210)
      ],
      '2026-08-24'
    )
    expect(result.passed).toBe(true)
  })

  it('excludes sessions outside the requested natural week', () => {
    const result = summarizeWeek(
      [session('1', '2026-08-23', 300), session('2', '2026-08-31', 300)],
      '2026-08-24'
    )
    expect(result.nodeCount).toBe(0)
  })
})
