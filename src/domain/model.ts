export const CREATIVE_TYPES = [
  '写作',
  '研究',
  '剪辑',
  '拍摄',
  '采访',
  '分镜',
  '阅读输入',
  '复盘',
  '其他'
] as const

export type CreativeType = (typeof CREATIVE_TYPES)[number]
export type ActivityType = CreativeType | '健身'
export type PlanType = '创作' | '健身' | '自由' | '休息'
export type DayPeriod = '上午' | '下午' | '晚上'
export type ProjectStatus = 'active' | 'archived'

export interface Project {
  id: string
  name: string
  description?: string
  stage: string
  nextAction: string
  status: ProjectStatus
  createdAt: number
  updatedAt: number
}

export interface CreativeSession {
  id: string
  projectId: string | null
  type: ActivityType
  goal: string
  done: string
  nextAction: string
  mood: string
  startedAt: number
  endedAt: number
  durationMinutes: number
  dateKey: string
  weekStart: string
  source: 'timer' | 'manual' | 'legacy'
  createdAt: number
  updatedAt: number
}

interface TimerDetails {
  timerId: string
  projectId: string
  type: CreativeType
  goal: string
  startedAt: number
  pausedDurationMs: number
}

export type TimerState =
  | { status: 'idle' }
  | (TimerDetails & { status: 'running' })
  | (TimerDetails & { status: 'paused'; pausedAt: number })

export interface WeekPlanItem {
  id: string
  weekStart: string
  dayIndex: number
  dayLabel: string
  type: PlanType
  periods: DayPeriod[]
  start: string
  end: string
  countsAsPlannedNode: boolean
  note: string
  updatedAt: number
}

export interface WeekReview {
  weekStart: string
  done: string
  nextWeekGoal: string
  createdAt: number
  updatedAt: number
}

export interface AppStateRecord {
  key: string
  value: unknown
}

export interface WeeklySummary {
  nodeCount: number
  creativeMinutes: number
  gymCount: number
  passed: boolean
  nodeDateKeys: string[]
}
