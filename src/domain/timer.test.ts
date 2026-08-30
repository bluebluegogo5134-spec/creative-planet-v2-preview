import { describe, expect, it } from 'vitest'
import { finishTimer, getElapsedMs, pauseTimer, resumeTimer, startTimer } from './timer'

describe('timer state machine', () => {
  it('excludes paused time from the final duration', () => {
    const started = startTimer(
      { projectId: 'p1', type: '写作', goal: '完成第一段' },
      1_000,
      'timer-1'
    )
    const paused = pauseTimer(started, 61_000)
    expect(getElapsedMs(paused, 301_000)).toBe(60_000)

    const resumed = resumeTimer(paused, 301_000)
    expect(getElapsedMs(resumed, 361_000)).toBe(120_000)
    expect(finishTimer(resumed, 361_000).durationMs).toBe(120_000)
  })

  it('keeps elapsed time stable while paused', () => {
    const running = startTimer({ projectId: 'p1', type: '研究', goal: '' }, 0, 'timer-2')
    const paused = pauseTimer(running, 90_000)
    expect(getElapsedMs(paused, 9_000_000)).toBe(90_000)
  })

  it('rejects invalid transitions', () => {
    expect(() => pauseTimer({ status: 'idle' }, 1_000)).toThrow()
    expect(() => resumeTimer({ status: 'idle' }, 1_000)).toThrow()
    expect(() => finishTimer({ status: 'idle' }, 1_000)).toThrow()
  })
})
