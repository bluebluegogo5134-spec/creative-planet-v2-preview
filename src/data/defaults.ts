import { addDaysKey } from '../domain/date'
import type { Project, WeekPlanItem } from '../domain/model'

export function createDefaultProjects(now: number): Project[] {
  return [
    {
      id: 'p1',
      name: '江西县城相亲角',
      stage: '口稿阶段',
      nextAction: '写完“进入相亲角”第一稿',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'p2',
      name: '神明的观众席',
      stage: '复盘阶段',
      nextAction: '整理人物与声音复盘',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'p3',
      name: '人类研究报告',
      stage: '设定阶段',
      nextAction: '补人物与世界观笔记',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
  ]
}

const DEFAULT_WEEK = [
  ['周一', '创作', '21:00', '22:00', true, '创作连接'],
  ['周二', '健身', '19:30', '21:00', false, '健身'],
  ['周三', '创作', '21:00', '22:00', true, '推进项目'],
  ['周四', '健身', '19:30', '21:00', false, '健身'],
  ['周五', '自由', '', '', false, '自由安排'],
  ['周六', '创作', '09:30', '18:30', true, '完整创作日'],
  ['周日', '创作', '14:00', '18:00', true, '半天创作']
] as const

export function createDefaultWeekPlan(weekStart: string, now: number): WeekPlanItem[] {
  return DEFAULT_WEEK.map(([dayLabel, type, start, end, countsAsPlannedNode, note], dayIndex) => ({
    id: `${weekStart}:${dayIndex}`,
    weekStart,
    dayIndex,
    dayLabel,
    type,
    start,
    end,
    countsAsPlannedNode,
    note,
    updatedAt: now
  }))
}

export function weekDateKey(item: WeekPlanItem): string {
  return addDaysKey(item.weekStart, item.dayIndex)
}
