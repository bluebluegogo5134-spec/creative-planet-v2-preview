import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createBackup, restoreBackup } from './backup'
import { db } from './db'

describe('backup and restore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('restores structured project and app state data', async () => {
    await db.projects.add({
      id: 'p1',
      name: '测试项目',
      stage: '写作阶段',
      nextAction: '继续第一章',
      status: 'active',
      createdAt: 1,
      updatedAt: 1
    })
    await db.appState.put({ key: 'schemaVersion', value: 2 })

    const backup = await createBackup()
    await db.projects.clear()
    await db.appState.clear()
    await restoreBackup(backup)

    expect((await db.projects.get('p1'))?.name).toBe('测试项目')
    expect((await db.appState.get('schemaVersion'))?.value).toBe(2)
    expect(await db.appState.get('restoredAt')).toBeTruthy()
  })

  it('rejects an unrelated JSON file before replacing data', async () => {
    await expect(restoreBackup({ hello: 'world' })).rejects.toThrow('有效')
  })
})
