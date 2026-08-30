import type {
  AppStateRecord,
  CreativeSession,
  Project,
  WeekPlanItem,
  WeekReview
} from '../domain/model'
import { db } from './db'

export interface CreativePlanetBackup {
  app: 'creative-planet'
  schemaVersion: 2
  exportedAt: string
  projects: Project[]
  sessions: CreativeSession[]
  weekPlans: WeekPlanItem[]
  weekReviews: WeekReview[]
  appState: AppStateRecord[]
}

function isBackup(value: unknown): value is CreativePlanetBackup {
  if (typeof value !== 'object' || value === null) return false
  const backup = value as Partial<CreativePlanetBackup>
  return (
    backup.app === 'creative-planet' &&
    backup.schemaVersion === 2 &&
    Array.isArray(backup.projects) &&
    Array.isArray(backup.sessions) &&
    Array.isArray(backup.weekPlans) &&
    Array.isArray(backup.weekReviews) &&
    Array.isArray(backup.appState)
  )
}

export async function createBackup(): Promise<CreativePlanetBackup> {
  const [projects, sessions, weekPlans, weekReviews, appState] = await Promise.all([
    db.projects.toArray(),
    db.sessions.toArray(),
    db.weekPlans.toArray(),
    db.weekReviews.toArray(),
    db.appState.toArray()
  ])
  return {
    app: 'creative-planet',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    projects,
    sessions,
    weekPlans,
    weekReviews,
    appState
  }
}

export async function restoreBackup(value: unknown): Promise<void> {
  if (!isBackup(value)) throw new Error('这不是有效的《创作星球》V2 备份')
  if (value.projects.length === 0) throw new Error('备份中没有项目，已停止导入')

  await db.transaction(
    'rw',
    [db.projects, db.sessions, db.weekPlans, db.weekReviews, db.appState],
    async () => {
      await Promise.all([
        db.projects.clear(),
        db.sessions.clear(),
        db.weekPlans.clear(),
        db.weekReviews.clear(),
        db.appState.clear()
      ])
      await db.projects.bulkPut(value.projects)
      await db.sessions.bulkPut(value.sessions)
      await db.weekPlans.bulkPut(value.weekPlans)
      await db.weekReviews.bulkPut(value.weekReviews)
      await db.appState.bulkPut(value.appState)
      await db.appState.put({ key: 'restoredAt', value: Date.now() })
    }
  )
}
