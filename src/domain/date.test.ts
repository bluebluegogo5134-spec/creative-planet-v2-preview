import { describe, expect, it } from 'vitest'
import { getWeekStart, toDateKey } from './date'

describe('Asia/Shanghai calendar boundaries', () => {
  it('uses Shanghai date when UTC crosses midnight differently', () => {
    expect(toDateKey(Date.parse('2026-08-30T15:30:00Z'))).toBe('2026-08-30')
    expect(toDateKey(Date.parse('2026-08-30T16:30:00Z'))).toBe('2026-08-31')
  })

  it('starts the week on Monday', () => {
    expect(getWeekStart(Date.parse('2026-08-30T15:30:00Z'))).toBe('2026-08-24')
    expect(getWeekStart(Date.parse('2026-08-30T16:30:00Z'))).toBe('2026-08-31')
  })
})
