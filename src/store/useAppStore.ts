import { create } from 'zustand'
import { getWeekStart, getWeekStartFromDateKey, toDateKey } from '../domain/date'
import type {
  CreativeSession,
  CreativeType,
  Project,
  TimerState,
  WeekPlanItem,
  WeekReview
} from '../domain/model'
import {
  finishTimer as finishTimerState,
  pauseTimer as pauseTimerState,
  resumeTimer as resumeTimerState,
  startTimer as startTimerState
} from '../domain/timer'
import { bootstrapDatabase, ensureWeekPlan } from '../data/bootstrap'
import { db } from '../data/db'

interface FinishInput {
  done: string
  nextAction: string
  mood: string
}

interface ManualSessionInput {
  dateKey: string
  projectId: string | null
  type: CreativeSession['type']
  minutes: number
  done: string
}

interface UpdateSessionInput {
  dateKey: string
  projectId: string | null
  type: CreativeSession['type']
  minutes: number
  done: string
  nextAction: string
  mood: string
}

interface AppStore {
  ready: boolean
  busy: boolean
  error: string | null
  projects: Project[]
  sessions: CreativeSession[]
  weekPlan: WeekPlanItem[]
  weekReview: WeekReview | null
  currentProjectId: string
  activeTimer: TimerState
  init: () => Promise<void>
  addProject: (name: string, description: string) => Promise<void>
  setCurrentProject: (id: string) => Promise<void>
  updateProject: (project: Project) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  startTimer: (projectId: string, type: CreativeType, goal: string) => Promise<void>
  pauseTimer: () => Promise<void>
  resumeTimer: () => Promise<void>
  finishTimer: (input: FinishInput) => Promise<void>
  addManualSession: (input: ManualSessionInput) => Promise<void>
  updateSession: (id: string, input: UpdateSessionInput) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  saveWeekPlan: (items: WeekPlanItem[]) => Promise<void>
  saveReview: (done: string, nextWeekGoal: string) => Promise<void>
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误'
}

async function appState<T>(key: string, fallback: T): Promise<T> {
  return ((await db.appState.get(key))?.value as T | undefined) ?? fallback
}

async function saveAppState(key: string, value: unknown): Promise<void> {
  await db.appState.put({ key, value })
}

export const useAppStore = create<AppStore>((set, get) => {
  async function refresh(): Promise<void> {
    const now = Date.now()
    const weekStart = getWeekStart(now)
    await ensureWeekPlan(weekStart, now)
    const [projects, sessions, weekPlan, weekReview, currentProjectId, activeTimer] =
      await Promise.all([
        db.projects.orderBy('updatedAt').reverse().toArray(),
        db.sessions.orderBy('endedAt').reverse().toArray(),
        db.weekPlans.where('weekStart').equals(weekStart).sortBy('dayIndex'),
        db.weekReviews.get(weekStart),
        appState('currentProjectId', ''),
        appState<TimerState>('activeTimer', { status: 'idle' })
      ])
    const activeProjects = projects.filter((project) => project.status === 'active')
    const safeCurrent = activeProjects.some((project) => project.id === currentProjectId)
      ? currentProjectId
      : activeProjects[0]?.id ?? ''
    if (safeCurrent !== currentProjectId) await saveAppState('currentProjectId', safeCurrent)
    set({
      projects,
      sessions,
      weekPlan,
      weekReview: weekReview ?? null,
      currentProjectId: safeCurrent,
      activeTimer,
      ready: true,
      error: null
    })
  }

  async function run(action: () => Promise<void>): Promise<void> {
    set({ busy: true, error: null })
    try {
      await action()
      await refresh()
    } catch (error) {
      set({ error: message(error) })
    } finally {
      set({ busy: false })
    }
  }

  return {
    ready: false,
    busy: false,
    error: null,
    projects: [],
    sessions: [],
    weekPlan: [],
    weekReview: null,
    currentProjectId: '',
    activeTimer: { status: 'idle' },

    init: async () => {
      if (get().ready || get().busy) return
      set({ busy: true, error: null })
      try {
        await bootstrapDatabase()
        await refresh()
      } catch (error) {
        set({ error: message(error) })
      } finally {
        set({ busy: false })
      }
    },

    addProject: async (name, description) =>
      run(async () => {
        const trimmed = name.trim()
        if (!trimmed) throw new Error('请先写下项目名称')
        const now = Date.now()
        const project: Project = {
          id: newId('project'),
          name: trimmed,
          description: description.trim(),
          stage: '新项目',
          nextAction: '写下这个项目的下一步',
          status: 'active',
          createdAt: now,
          updatedAt: now
        }
        await db.transaction('rw', [db.projects, db.appState], async () => {
          await db.projects.add(project)
          await saveAppState('currentProjectId', project.id)
        })
      }),

    setCurrentProject: async (id) =>
      run(async () => {
        if (!(await db.projects.get(id))) throw new Error('项目不存在')
        await saveAppState('currentProjectId', id)
      }),

    updateProject: async (project) =>
      run(async () => {
        await db.projects.put({ ...project, updatedAt: Date.now() })
      }),

    archiveProject: async (id) =>
      run(async () => {
        const project = await db.projects.get(id)
        if (!project) throw new Error('项目不存在')
        const activeCount = await db.projects.where('status').equals('active').count()
        if (activeCount <= 1) throw new Error('至少需要保留一个进行中的项目')
        await db.projects.put({ ...project, status: 'archived', updatedAt: Date.now() })
      }),

    deleteProject: async (id) =>
      run(async () => {
        const project = await db.projects.get(id)
        if (!project) throw new Error('项目不存在')
        const timer = get().activeTimer
        if (timer.status !== 'idle' && timer.projectId === id) {
          throw new Error('这个项目正在计时，请先结束本次创作')
        }
        const activeProjects = await db.projects.where('status').equals('active').toArray()
        if (project.status === 'active' && activeProjects.length <= 1) {
          throw new Error('至少需要保留一个进行中的项目')
        }
        await db.transaction('rw', [db.projects, db.appState], async () => {
          await db.projects.delete(id)
          if (get().currentProjectId === id) {
            const replacement = activeProjects.find((item) => item.id !== id)
            if (replacement) await saveAppState('currentProjectId', replacement.id)
          }
        })
      }),

    startTimer: async (projectId, type, goal) =>
      run(async () => {
        if (get().activeTimer.status !== 'idle') throw new Error('已有一次创作正在进行')
        const timer = startTimerState({ projectId, type, goal }, Date.now(), newId('timer'))
        await saveAppState('activeTimer', timer)
      }),

    pauseTimer: async () =>
      run(async () => {
        const timer = pauseTimerState(get().activeTimer, Date.now())
        await saveAppState('activeTimer', timer)
      }),

    resumeTimer: async () =>
      run(async () => {
        const timer = resumeTimerState(get().activeTimer, Date.now())
        await saveAppState('activeTimer', timer)
      }),

    finishTimer: async (input) =>
      run(async () => {
        const timer = get().activeTimer
        if (timer.status === 'idle') throw new Error('当前没有正在进行的创作')
        const now = Date.now()
        const finished = finishTimerState(timer, now)
        const dateKey = toDateKey(timer.startedAt)
        const durationMinutes = Math.max(1, Math.round(finished.durationMs / 60_000))
        const session: CreativeSession = {
          id: newId('session'),
          projectId: timer.projectId,
          type: timer.type,
          goal: timer.goal,
          done: input.done.trim(),
          nextAction: input.nextAction.trim(),
          mood: input.mood,
          startedAt: timer.startedAt,
          endedAt: finished.endedAt,
          durationMinutes,
          dateKey,
          weekStart: getWeekStartFromDateKey(dateKey),
          source: 'timer',
          createdAt: now,
          updatedAt: now
        }
        await db.transaction('rw', [db.sessions, db.projects, db.appState], async () => {
          await db.sessions.add(session)
          if (session.nextAction) {
            const project = await db.projects.get(timer.projectId)
            if (project) {
              await db.projects.put({
                ...project,
                nextAction: session.nextAction,
                updatedAt: now
              })
            }
          }
          await saveAppState('activeTimer', { status: 'idle' } satisfies TimerState)
        })
      }),

    addManualSession: async (input) =>
      run(async () => {
        const minimum = input.type === '健身' ? 0 : 1
        const minutes = Math.max(minimum, Math.min(24 * 60, Math.round(input.minutes)))
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)) throw new Error('日期格式不正确')
        const now = Date.now()
        const endedAt = Date.parse(`${input.dateKey}T12:00:00+08:00`)
        await db.sessions.add({
          id: newId('manual-session'),
          projectId: input.type === '健身' ? null : input.projectId,
          type: input.type,
          goal: '',
          done: input.done.trim(),
          nextAction: '',
          mood: '',
          startedAt: endedAt - minutes * 60_000,
          endedAt,
          durationMinutes: minutes,
          dateKey: input.dateKey,
          weekStart: getWeekStartFromDateKey(input.dateKey),
          source: 'manual',
          createdAt: now,
          updatedAt: now
        })
      }),

    updateSession: async (id, input) =>
      run(async () => {
        const existing = await db.sessions.get(id)
        if (!existing) throw new Error('记录不存在')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)) throw new Error('日期格式不正确')
        const minimum = input.type === '健身' ? 0 : 1
        const minutes = Math.max(minimum, Math.min(24 * 60, Math.round(input.minutes)))
        const endedAt = input.dateKey === existing.dateKey
          ? existing.endedAt
          : Date.parse(`${input.dateKey}T12:00:00+08:00`)
        await db.sessions.put({
          ...existing,
          projectId: input.type === '健身' ? null : input.projectId,
          type: input.type,
          done: input.done.trim(),
          nextAction: input.nextAction.trim(),
          mood: input.mood.trim(),
          startedAt: endedAt - minutes * 60_000,
          endedAt,
          durationMinutes: minutes,
          dateKey: input.dateKey,
          weekStart: getWeekStartFromDateKey(input.dateKey),
          updatedAt: Date.now()
        })
      }),

    deleteSession: async (id) =>
      run(async () => {
        await db.sessions.delete(id)
      }),

    saveWeekPlan: async (items) =>
      run(async () => {
        const updatedAt = Date.now()
        await db.weekPlans.bulkPut(items.map((item) => ({ ...item, updatedAt })))
      }),

    saveReview: async (done, nextWeekGoal) =>
      run(async () => {
        const now = Date.now()
        const weekStart = getWeekStart(now)
        const existing = await db.weekReviews.get(weekStart)
        await db.weekReviews.put({
          weekStart,
          done: done.trim(),
          nextWeekGoal: nextWeekGoal.trim(),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now
        })
      })
  }
})
