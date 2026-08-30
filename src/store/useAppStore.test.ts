import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getWeekStartFromDateKey } from '../domain/date'
import { db } from '../data/db'
import { useAppStore } from './useAppStore'

describe('session record workflow', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    useAppStore.setState({
      ready: false,
      busy: false,
      error: null,
      projects: [],
      sessions: [],
      weekPlan: [],
      weekReview: null,
      currentProjectId: '',
      activeTimer: { status: 'idle' }
    })
    await useAppStore.getState().init()
  })

  it('edits the date, duration and activity type while keeping week history correct', async () => {
    const projectId = useAppStore.getState().currentProjectId
    await useAppStore.getState().addManualSession({
      dateKey: '2026-08-24',
      projectId,
      type: '写作',
      minutes: 45,
      done: '完成初稿'
    })

    const session = useAppStore.getState().sessions[0]
    await useAppStore.getState().updateSession(session.id, {
      dateKey: '2026-08-30',
      projectId,
      type: '健身',
      minutes: 90,
      done: '力量训练',
      nextAction: '',
      mood: '有精神'
    })

    const updated = await db.sessions.get(session.id)
    expect(updated).toMatchObject({
      dateKey: '2026-08-30',
      weekStart: getWeekStartFromDateKey('2026-08-30'),
      projectId: null,
      type: '健身',
      durationMinutes: 90,
      done: '力量训练',
      mood: '有精神'
    })
  })
})
