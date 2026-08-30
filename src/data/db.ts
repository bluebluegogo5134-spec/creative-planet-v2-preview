import Dexie, { type EntityTable } from 'dexie'
import type {
  AppStateRecord,
  CreativeSession,
  Project,
  WeekPlanItem,
  WeekReview
} from '../domain/model'

export class CreativePlanetDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  sessions!: EntityTable<CreativeSession, 'id'>
  weekPlans!: EntityTable<WeekPlanItem, 'id'>
  weekReviews!: EntityTable<WeekReview, 'weekStart'>
  appState!: EntityTable<AppStateRecord, 'key'>

  constructor() {
    super('creativePlanetV2')
    this.version(1).stores({
      projects: 'id, status, updatedAt',
      sessions: 'id, projectId, type, dateKey, weekStart, endedAt',
      weekPlans: 'id, weekStart, dayIndex',
      weekReviews: 'weekStart, updatedAt',
      appState: 'key'
    })
  }
}

export const db = new CreativePlanetDatabase()
