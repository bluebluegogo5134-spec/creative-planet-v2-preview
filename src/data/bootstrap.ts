import { getWeekStart, getWeekStartFromDateKey } from '../domain/date'
import type {
  ActivityType,
  AppStateRecord,
  CreativeSession,
  CreativeType,
  Project,
  TimerState,
  WeekPlanItem,
  WeekReview
} from '../domain/model'
import { CREATIVE_TYPES } from '../domain/model'
import { db } from './db'
import { createDefaultProjects, createDefaultWeekPlan } from './defaults'

const LEGACY_KEY = 'creativePlanetSingleScreenV2'

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function legacyType(value: unknown): ActivityType {
  if (value === '健身') return '健身'
  return CREATIVE_TYPES.includes(value as CreativeType) ? (value as CreativeType) : '其他'
}

function readLegacy(): Record<string, unknown> | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null')
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function migrateProjects(legacy: Record<string, unknown>, now: number): Project[] {
  if (!Array.isArray(legacy.projects) || legacy.projects.length === 0) {
    return createDefaultProjects(now)
  }

  return legacy.projects.filter(isRecord).map((project) => ({
    id: text(project.id, id('project')),
    name: text(project.name, '未命名项目'),
    stage: text(project.stage, '进行中'),
    nextAction: text(project.next, '写下这个项目的下一步'),
    status: 'active',
    createdAt: now,
    updatedAt: now
  }))
}

function migrateSessions(legacy: Record<string, unknown>, now: number): CreativeSession[] {
  if (!Array.isArray(legacy.logs)) return []
  return legacy.logs.filter(isRecord).flatMap((log) => {
    const dateKey = text(log.date)
    const minutes = Math.max(0, Number(log.minutes) || 0)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || minutes <= 0) return []
    const createdAt = Number.isFinite(Date.parse(text(log.createdAt)))
      ? Date.parse(text(log.createdAt))
      : Date.parse(`${dateKey}T12:00:00+08:00`)
    return [
      {
        id: id('legacy-session'),
        projectId: text(log.projectId) || null,
        type: legacyType(log.type),
        goal: '',
        done: text(log.done),
        nextAction: text(log.next),
        mood: text(log.mood),
        startedAt: createdAt - minutes * 60_000,
        endedAt: createdAt,
        durationMinutes: minutes,
        dateKey,
        weekStart: getWeekStartFromDateKey(dateKey),
        source: 'legacy' as const,
        createdAt,
        updatedAt: now
      }
    ]
  })
}

function migrateWeekPlan(
  legacy: Record<string, unknown>,
  weekStart: string,
  now: number
): WeekPlanItem[] {
  if (!Array.isArray(legacy.week) || legacy.week.length !== 7) {
    return createDefaultWeekPlan(weekStart, now)
  }
  return legacy.week.filter(isRecord).map((item, dayIndex) => ({
    id: `${weekStart}:${dayIndex}`,
    weekStart,
    dayIndex,
    dayLabel: text(item.day, `第${dayIndex + 1}天`),
    type:
      item.type === '健身' || item.type === '自由' || item.type === '休息'
        ? item.type
        : '创作',
    start: text(item.start),
    end: text(item.end),
    countsAsPlannedNode: Boolean(item.node),
    note: text(item.note),
    updatedAt: now
  }))
}

function migrateReview(
  legacy: Record<string, unknown>,
  weekStart: string,
  now: number
): WeekReview | null {
  if (!isRecord(legacy.review)) return null
  const done = text(legacy.review.done)
  const nextWeekGoal = text(legacy.review.goal)
  if (!done && !nextWeekGoal) return null
  return { weekStart, done, nextWeekGoal, createdAt: now, updatedAt: now }
}

function migrateTimer(legacy: Record<string, unknown>): TimerState {
  if (!isRecord(legacy.timer)) return { status: 'idle' }
  const startedAt = Number(legacy.timer.startedAt)
  const projectId = text(legacy.timer.projectId)
  if (!Number.isFinite(startedAt) || !projectId) return { status: 'idle' }
  const type = legacyType(legacy.timer.type)
  return {
    status: 'running',
    timerId: id('legacy-timer'),
    projectId,
    type: type === '健身' ? '其他' : type,
    goal: text(legacy.timer.goal),
    startedAt,
    pausedDurationMs: 0
  }
}

export async function ensureWeekPlan(weekStart: string, now: number): Promise<void> {
  if ((await db.weekPlans.where('weekStart').equals(weekStart).count()) > 0) return
  await db.weekPlans.bulkPut(createDefaultWeekPlan(weekStart, now))
}

export async function bootstrapDatabase(now = Date.now()): Promise<void> {
  const initialized = await db.appState.get('schemaVersion')
  const weekStart = getWeekStart(now)

  if (initialized) {
    await ensureWeekPlan(weekStart, now)
    return
  }

  const legacy = readLegacy()
  const projects = legacy ? migrateProjects(legacy, now) : createDefaultProjects(now)
  const sessions = legacy ? migrateSessions(legacy, now) : []
  const plan = legacy
    ? migrateWeekPlan(legacy, weekStart, now)
    : createDefaultWeekPlan(weekStart, now)
  const review = legacy ? migrateReview(legacy, weekStart, now) : null
  const timer = legacy ? migrateTimer(legacy) : ({ status: 'idle' } satisfies TimerState)
  const legacyCurrentProject = legacy ? text(legacy.currentProject) : ''
  const currentProjectId = projects.some((project) => project.id === legacyCurrentProject)
    ? legacyCurrentProject
    : projects[0].id

  const appState: AppStateRecord[] = [
    { key: 'schemaVersion', value: 2 },
    { key: 'currentProjectId', value: currentProjectId },
    { key: 'activeTimer', value: timer },
    { key: 'legacyImported', value: Boolean(legacy) },
    { key: 'initializedAt', value: now }
  ]

  await db.transaction(
    'rw',
    [db.projects, db.sessions, db.weekPlans, db.weekReviews, db.appState],
    async () => {
      await db.projects.bulkPut(projects)
      await db.sessions.bulkPut(sessions)
      await db.weekPlans.bulkPut(plan)
      if (review) await db.weekReviews.put(review)
      await db.appState.bulkPut(appState)
    }
  )
}
