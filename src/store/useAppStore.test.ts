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

  it('creates a project with an introduction and keeps sessions when the project is deleted', async () => {
    await useAppStore.getState().addProject('新的纪录片', '记录一群具体的人和他们的生活。')
    const projectId = useAppStore.getState().currentProjectId
    await useAppStore.getState().addManualSession({
      dateKey: '2026-08-30',
      projectId,
      type: '拍摄',
      minutes: 60,
      done: '完成第一次拍摄'
    })

    await useAppStore.getState().deleteProject(projectId)

    expect(await db.projects.get(projectId)).toBeUndefined()
    expect((await db.sessions.where('projectId').equals(projectId).count())).toBe(1)
    expect(useAppStore.getState().currentProjectId).not.toBe(projectId)
  })

  it('saves the whole weekly calendar with broad day periods', async () => {
    const plan = useAppStore.getState().weekPlan.map((item, index) => ({
      ...item,
      type: index === 4 ? '自由' as const : item.type,
      periods: index === 5 ? ['上午', '下午'] as const : item.periods
    }))

    await useAppStore.getState().saveWeekPlan(plan.map((item) => ({ ...item, periods: [...item.periods] })))

    const saturday = await db.weekPlans.get(plan[5].id)
    expect(saturday?.periods).toEqual(['上午', '下午'])
  })

  it('finishes an active timer and creates a visible session record', async () => {
    const projectId = useAppStore.getState().currentProjectId
    await useAppStore.getState().startTimer(projectId, '写作', '完成一小段')

    await useAppStore.getState().finishTimer({
      done: '完成测试记录',
      nextAction: '继续下一段',
      mood: '慢慢进去了'
    })

    expect(useAppStore.getState().activeTimer.status).toBe('idle')
    expect(useAppStore.getState().sessions[0]).toMatchObject({
      projectId,
      type: '写作',
      done: '完成测试记录',
      nextAction: '继续下一段'
    })
  })
})
