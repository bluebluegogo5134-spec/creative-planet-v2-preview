import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { addDaysKey, getWeekStart, toDateKey } from './domain/date'
import { CREATIVE_TYPES, type CreativeSession, type DayPeriod, type Project, type WeekPlanItem } from './domain/model'
import { getElapsedMs } from './domain/timer'
import { summarizeWeek, WEEKLY_MINUTE_GOAL, WEEKLY_NODE_GOAL } from './domain/weekly'
import { weekDateKey } from './data/defaults'
import { createBackup, restoreBackup } from './data/backup'
import { useAppStore } from './store/useAppStore'

type Page = 'home' | 'projects' | 'session' | 'plan' | 'review'

const NAV: Array<{ id: Page; icon: string; label: string }> = [
  { id: 'home', icon: '⌂', label: '首页' },
  { id: 'projects', icon: '◉', label: '项目' },
  { id: 'session', icon: '＋', label: '记录' },
  { id: 'plan', icon: '☷', label: '计划' },
  { id: 'review', icon: '✦', label: '复盘' }
]

const PLAN_TYPES: Array<{ value: WeekPlanItem['type']; icon: string; label: string }> = [
  { value: '创作', icon: '🪶', label: '创作连接' },
  { value: '健身', icon: '🏋️', label: '健身' },
  { value: '自由', icon: '⭐', label: '自由' },
  { value: '休息', icon: '☁️', label: '休息' }
]

const DAY_PERIODS: DayPeriod[] = ['上午', '下午', '晚上']

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':')
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const pageScrollRef = useRef<HTMLDivElement>(null)
  const ready = useAppStore((state) => state.ready)
  const error = useAppStore((state) => state.error)
  const activeTimer = useAppStore((state) => state.activeTimer)
  const init = useAppStore((state) => state.init)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    pageScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [page])

  const goToPage = (nextPage: Page) => {
    if (nextPage === page) {
      pageScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setPage(nextPage)
  }

  if (!ready) {
    return (
      <main className="app-shell loading-shell">
        <div className="loading-orbit" aria-hidden="true">✦</div>
        <p>正在回到你的创作星球……</p>
        {error && <p className="error-banner">{error}</p>}
      </main>
    )
  }

  return (
    <main className="app-shell">
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div ref={pageScrollRef} className="page-scroll">
        {page === 'home' && <HomePage goTo={goToPage} />}
        {page === 'projects' && <ProjectsPage />}
        {page === 'session' && <SessionPage />}
        {page === 'plan' && <PlanPage />}
        {page === 'review' && <ReviewPage />}
      </div>
      <nav className="bottom-nav" aria-label="主要导航">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${page === item.id ? 'active' : ''} ${item.id === 'session' ? 'nav-create' : ''}`}
            onClick={() => goToPage(item.id)}
            aria-current={page === item.id ? 'page' : undefined}
          >
            <span className="nav-icon">{item.id === 'session' && activeTimer.status !== 'idle' ? '●' : item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </main>
  )
}

function HomePage({ goTo }: { goTo: (page: Page) => void }) {
  const projects = useAppStore((state) => state.projects)
  const sessions = useAppStore((state) => state.sessions)
  const weekPlan = useAppStore((state) => state.weekPlan)
  const currentProjectId = useAppStore((state) => state.currentProjectId)
  const activeTimer = useAppStore((state) => state.activeTimer)
  const setCurrentProject = useAppStore((state) => state.setCurrentProject)
  const currentWeek = getWeekStart(Date.now())
  const summary = useMemo(() => summarizeWeek(sessions, currentWeek), [sessions, currentWeek])
  const project = projects.find((item) => item.id === currentProjectId) ?? projects[0]
  const recent = sessions.slice(0, 3)
  const completedDates = new Set(
    sessions
      .filter((session) => session.weekStart === currentWeek && session.type !== '健身')
      .map((session) => session.dateKey)
  )

  return (
    <>
      <header className="home-hero" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,252,242,.96), rgba(232,242,251,.18)), url("./assets/hero2.jpg")' }}>
        <div className="hero-copy">
          <span>创作星球</span>
          <h1>慢一点也没关系，<br />但不要离自己的星球太远</h1>
        </div>
      </header>

      <section className="content-stack home-stack">
        <article className="card progress-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">本周达标进度</p>
              <h2>{summary.passed ? '这一周，星球已经亮起来了' : '守住四次创作连接'}</h2>
            </div>
            <span className={`status-seal ${summary.passed ? 'passed' : ''}`}>{summary.passed ? '达标' : '进行中'}</span>
          </div>
          <div className="metric-grid">
            <Metric label="创作节点" value={`${summary.nodeCount}/${WEEKLY_NODE_GOAL}`} progress={summary.nodeCount / WEEKLY_NODE_GOAL} />
            <Metric label="累计时长" value={formatMinutes(summary.creativeMinutes)} progress={summary.creativeMinutes / WEEKLY_MINUTE_GOAL} />
            <Metric label="健身" value={`${summary.gymCount}次`} progress={summary.gymCount / 2} tone="green" />
          </div>
        </article>

        <article className="card current-project-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">当前创作</p>
              <h2>{project?.name ?? '先建立一颗项目星球'}</h2>
            </div>
            <button className="text-button" type="button" onClick={() => goTo('projects')}>项目管理</button>
          </div>
          {projects.length > 0 && (
            <select value={currentProjectId} onChange={(event) => void setCurrentProject(event.target.value)} aria-label="切换当前项目">
              {projects.filter((item) => item.status === 'active').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          )}
          <p className="next-action">下一步：{project?.nextAction || '还没有设置下一步'}</p>
          <button className="primary-button create-gate" type="button" onClick={() => goTo('session')}>
            {activeTimer.status === 'idle' ? '✦ 开始创作' : activeTimer.status === 'paused' ? '✦ 回去继续' : '✦ 创作进行中'}
          </button>
        </article>

        <article className="card leave-card">
          <span className="moon">☾</span>
          <div>
            <p className="eyebrow">上次离开时</p>
            <p>{recent[0]?.nextAction || '还没有记录，今天可以从很小的一步开始。'}</p>
          </div>
        </article>

        <article className="card week-card">
          <div className="section-heading compact">
            <h2>本周计划</h2>
            <button className="text-button" type="button" onClick={() => goTo('plan')}>调整</button>
          </div>
          <div className="week-strip">
            {weekPlan.map((item) => {
              const dateKey = weekDateKey(item)
              return (
                <div className={`day-chip ${completedDates.has(dateKey) ? 'done' : ''}`} key={item.id}>
                  <b>{item.dayLabel.replace('周', '')}</b>
                  <span>{item.type === '创作' ? '🪶' : item.type === '健身' ? '🏋️' : item.type === '自由' ? '⭐' : '☾'}</span>
                  <small>{completedDates.has(dateKey) ? '完成' : item.type}</small>
                </div>
              )
            })}
          </div>
        </article>

        <article className="card recent-card">
          <div className="section-heading compact"><h2>最近记录</h2><button className="text-button" type="button" onClick={() => goTo('session')}>查看</button></div>
          {recent.length ? recent.map((item) => <SessionLine key={item.id} session={item} projects={projects} />) : <p className="empty-copy">还没有创作记录。</p>}
        </article>
      </section>
    </>
  )
}

function Metric({ label, value, progress, tone = 'blue' }: { label: string; value: string; progress: number; tone?: 'blue' | 'green' }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="progress-track"><i className={tone} style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} /></div>
    </div>
  )
}

function ProjectsPage() {
  const projects = useAppStore((state) => state.projects)
  const sessions = useAppStore((state) => state.sessions)
  const addProject = useAppStore((state) => state.addProject)
  const updateProject = useAppStore((state) => state.updateProject)
  const archiveProject = useAppStore((state) => state.archiveProject)
  const deleteProject = useAppStore((state) => state.deleteProject)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function createProject() {
    if (!name.trim()) return
    await addProject(name, description)
    setName('')
    setDescription('')
    setCreating(false)
  }

  return (
    <PageFrame eyebrow="把每一个想法，孕育成一颗星球" title="项目星系" image="hero1.jpg">
      <div className="project-page-heading">
        <div><p className="eyebrow">你的创作星系</p><h2>已建立项目</h2><small>{projects.filter((project) => project.status === 'active').length} 个进行中 · {projects.filter((project) => project.status === 'archived').length} 个已归档</small></div>
        <button className="small-add-project" type="button" aria-expanded={creating} onClick={() => setCreating((value) => !value)}>{creating ? '收起' : '＋ 新建项目'}</button>
      </div>
      {creating && <article className="card create-project-form">
        <div><p className="eyebrow">孕育一颗新星球</p><h2>新建项目</h2></div>
        <label htmlFor="new-project">项目名称<input id="new-project" value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：县城就业" /></label>
        <label htmlFor="new-project-description">项目简介<textarea id="new-project-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="这个项目想记录什么、回应什么问题？" /></label>
        <div className="button-row"><button className="secondary-button" type="button" onClick={() => setCreating(false)}>取消</button><button className="primary-button" type="button" onClick={() => void createProject()}>创建项目</button></div>
      </article>}
      <div className="project-list">
        {[...projects].sort((a, b) => Number(a.status === 'archived') - Number(b.status === 'archived') || b.updatedAt - a.updatedAt).map((project) => {
          const minutes = sessions.filter((session) => session.projectId === project.id).reduce((sum, session) => sum + session.durationMinutes, 0)
          return <ProjectCard key={project.id} project={project} minutes={minutes} save={updateProject} archive={archiveProject} remove={deleteProject} />
        })}
      </div>
      <DataSafetyCard />
    </PageFrame>
  )
}

function ProjectCard({ project, minutes, save, archive, remove }: { project: Project; minutes: number; save: (project: Project) => Promise<void>; archive: (id: string) => Promise<void>; remove: (id: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project)

  async function submit() {
    await save({ ...draft, name: draft.name.trim() || project.name })
    setEditing(false)
  }

  return (
    <article className={`card project-card ${project.status === 'archived' ? 'archived' : ''}`}>
      {editing ? (
        <div className="edit-project-grid">
          <label>项目名<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label>项目简介<textarea value={draft.description ?? ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="这个项目想记录什么、回应什么问题？" /></label>
          <label>阶段<input value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value })} /></label>
          <label>下一步<textarea value={draft.nextAction} onChange={(event) => setDraft({ ...draft, nextAction: event.target.value })} /></label>
          <div className="button-row"><button className="secondary-button" type="button" onClick={() => setEditing(false)}>取消</button><button className="primary-button" type="button" onClick={() => void submit()}>保存</button></div>
        </div>
      ) : (
        <>
          <div className="section-heading compact">
            <div><h2>{project.name}</h2><div className="project-status-row"><span className="tag">{project.stage}</span><span className={`project-status ${project.status}`}>{project.status === 'active' ? '进行中' : '已归档'}</span></div></div>
            <span className="project-hours">{formatMinutes(minutes)}</span>
          </div>
          {project.description && <p className="project-description">{project.description}</p>}
          <p className="next-action">下一步：{project.nextAction}</p>
          <details className="project-menu">
            <summary>项目管理 <span aria-hidden="true">•••</span></summary>
            <div className="project-action-grid">
              <button className="secondary-button" type="button" onClick={() => { setDraft(project); setEditing(true) }}>编辑项目</button>
              {project.status === 'active' ? <button className="archive-button" type="button" onClick={() => { if (window.confirm(`将“${project.name}”移入归档？历史记录会保留。`)) void archive(project.id) }}>归档项目</button> : <button className="secondary-button" type="button" onClick={() => void save({ ...project, status: 'active' })}>恢复项目</button>}
              <button className="danger-button project-delete-action" type="button" onClick={() => { if (window.confirm(`永久删除“${project.name}”？历史创作记录会保留，但之后不再显示这个项目名。`)) void remove(project.id) }}>删除项目</button>
            </div>
          </details>
        </>
      )}
    </article>
  )
}

function DataSafetyCard() {
  const [status, setStatus] = useState('')

  async function download() {
    const backup = await createBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `创作星球备份-${toDateKey(Date.now())}.json`
    link.click()
    URL.revokeObjectURL(url)
    setStatus('备份已导出')
  }

  async function importFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      if (!window.confirm('导入会用备份内容替换当前设备上的《创作星球》数据，确定继续吗？')) return
      await restoreBackup(parsed)
      window.location.reload()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入失败')
    }
  }

  return (
    <article className="card data-card">
      <div><p className="eyebrow">数据安全</p><h2>给创作留下可恢复的副本</h2><p className="empty-copy">数据只保存在当前设备。建议定期导出 JSON 备份。</p></div>
      <div className="button-row"><button className="secondary-button" type="button" onClick={() => void download()}>导出备份</button><label className="file-button">导入备份<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = '' }} /></label></div>
      {status && <p className="data-status" role="status">{status}</p>}
    </article>
  )
}

function SessionPage() {
  const projects = useAppStore((state) => state.projects).filter((project) => project.status === 'active')
  const sessions = useAppStore((state) => state.sessions)
  const currentProjectId = useAppStore((state) => state.currentProjectId)
  const activeTimer = useAppStore((state) => state.activeTimer)
  const startTimer = useAppStore((state) => state.startTimer)
  const pauseTimer = useAppStore((state) => state.pauseTimer)
  const resumeTimer = useAppStore((state) => state.resumeTimer)
  const finishTimer = useAppStore((state) => state.finishTimer)
  const addManualSession = useAppStore((state) => state.addManualSession)
  const updateSession = useAppStore((state) => state.updateSession)
  const deleteSession = useAppStore((state) => state.deleteSession)
  const [projectId, setProjectId] = useState(currentProjectId)
  const [type, setType] = useState<(typeof CREATIVE_TYPES)[number]>('写作')
  const [goal, setGoal] = useState('')
  const [showFinish, setShowFinish] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [editingSession, setEditingSession] = useState<CreativeSession | null>(null)
  const [sessionNotice, setSessionNotice] = useState('')
  const [tick, setTick] = useState(Date.now())

  useEffect(() => {
    if (activeTimer.status === 'idle') return
    setTick(Date.now())
    const interval = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [activeTimer.status])

  const selectedProjectId = activeTimer.status !== 'idle' ? activeTimer.projectId : projectId
  const activeProject = projects.find((project) => project.id === selectedProjectId)

  return (
    <PageFrame eyebrow="走进花丛小径，进入你的故事" title="开始创作" image="hero5.jpg">
      <article className="card timer-card">
        {activeTimer.status === 'idle' ? (
          <>
            <label>选择项目<select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <div className="two-column-form">
              <label>这次做什么<select value={type} onChange={(event) => setType(event.target.value as typeof type)}>{CREATIVE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>只推进一件事<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="写下这次目标" /></label>
            </div>
            <div className="timer-display">00:00:00</div>
            <div className="button-row"><button className="primary-button" type="button" disabled={!projectId} onClick={() => void startTimer(projectId, type, goal)}>开始计时</button><button className="secondary-button" type="button" onClick={() => setShowManual(true)}>手动补录</button></div>
          </>
        ) : (
          <>
            <div className="active-session-copy"><span>{activeTimer.status === 'paused' ? '已暂停' : '创作进行中'}</span><h2>{activeProject?.name}</h2><p>{activeTimer.goal || activeTimer.type}</p></div>
            <div className="timer-display active">{formatElapsed(getElapsedMs(activeTimer, tick))}</div>
            <div className="button-row">
              {activeTimer.status === 'running' ? <button className="secondary-button" type="button" onClick={() => void pauseTimer()}>暂停</button> : <button className="primary-button" type="button" onClick={() => void resumeTimer()}>恢复</button>}
              <button className="primary-button" type="button" onClick={() => { setSessionNotice(''); setShowFinish(true) }}>结束并记录</button>
            </div>
          </>
        )}
      </article>

      {sessionNotice && <p className="session-notice" role="status">{sessionNotice}</p>}
      {showFinish && activeTimer.status !== 'idle' && <FinishPanel close={() => setShowFinish(false)} save={async (input) => {
        await finishTimer(input)
        if (useAppStore.getState().activeTimer.status === 'idle') {
          setShowFinish(false)
          setGoal('')
          setSessionNotice('这次创作已经记录下来。')
        }
      }} />}
      {showManual && <ManualPanel projects={projects} close={() => setShowManual(false)} save={async (input) => { await addManualSession(input); setShowManual(false) }} />}
      {editingSession && <EditSessionPanel session={editingSession} projects={projects} close={() => setEditingSession(null)} save={async (input) => { await updateSession(editingSession.id, input); setEditingSession(null) }} />}

      <article className="card records-card">
        <div className="section-heading compact"><h2>最近记录</h2><button className="text-button" type="button" onClick={() => setShowManual(true)}>补录</button></div>
        {sessions.length ? sessions.slice(0, 12).map((session) => (
          <div className="record-row" key={session.id}>
            <SessionLine session={session} projects={projects} />
            <div className="record-actions"><button className="edit-button" type="button" onClick={() => setEditingSession(session)}>编辑</button><button className="delete-button" type="button" onClick={() => { if (window.confirm('确定删除这条记录吗？此操作不能撤销。')) void deleteSession(session.id) }}>删除</button></div>
          </div>
        )) : <p className="empty-copy">还没有记录，先从今天的一小步开始。</p>}
      </article>
    </PageFrame>
  )
}

function FinishPanel({ close, save }: { close: () => void; save: (input: { done: string; nextAction: string; mood: string }) => Promise<void> }) {
  const [done, setDone] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [mood, setMood] = useState('慢慢进去了')
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [])

  async function submit() {
    if (saving) return
    setSaving(true)
    await save({ done, nextAction, mood })
    setSaving(false)
  }

  return (
    <article ref={panelRef} className="card finish-panel" tabIndex={-1}>
      <h2>结束这次创作</h2>
      <label>这次推进了什么？<textarea value={done} onChange={(event) => setDone(event.target.value)} /></label>
      <label>下一次从哪里继续？<textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label>
      <fieldset><legend>进入状态怎么样？</legend><div className="mood-row">{['很难进去', '慢慢进去了', '很沉浸'].map((item) => <button key={item} type="button" className={mood === item ? 'selected' : ''} onClick={() => setMood(item)}>{item}</button>)}</div></fieldset>
      <div className="button-row"><button className="secondary-button" type="button" disabled={saving} onClick={close}>返回</button><button className="primary-button" type="button" disabled={saving} onClick={() => void submit()}>{saving ? '正在保存…' : '保存记录'}</button></div>
    </article>
  )
}

function ManualPanel({ projects, close, save }: { projects: Project[]; close: () => void; save: (input: { dateKey: string; projectId: string | null; type: CreativeSession['type']; minutes: number; done: string }) => Promise<void> }) {
  const [dateKey, setDateKey] = useState(toDateKey(Date.now()))
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [type, setType] = useState<CreativeSession['type']>('写作')
  const [minutes, setMinutes] = useState(60)
  const [done, setDone] = useState('')
  return (
    <article className="card finish-panel">
      <h2>手动补录</h2>
      <div className="two-column-form"><label>日期<input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} /></label><label>分钟<input type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label></div>
      <label>类型<select value={type} onChange={(event) => setType(event.target.value as CreativeSession['type'])}>{[...CREATIVE_TYPES, '健身'].map((item) => <option key={item}>{item}</option>)}</select></label>
      {type !== '健身' && <label>项目<select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
      <label>推进了什么<textarea value={done} onChange={(event) => setDone(event.target.value)} /></label>
      <div className="button-row"><button className="secondary-button" type="button" onClick={close}>取消</button><button className="primary-button" type="button" onClick={() => void save({ dateKey, projectId: type === '健身' ? null : projectId, type, minutes, done })}>保存补录</button></div>
    </article>
  )
}

function EditSessionPanel({ session, projects, close, save }: { session: CreativeSession; projects: Project[]; close: () => void; save: (input: { dateKey: string; projectId: string | null; type: CreativeSession['type']; minutes: number; done: string; nextAction: string; mood: string }) => Promise<void> }) {
  const [dateKey, setDateKey] = useState(session.dateKey)
  const [projectId, setProjectId] = useState(session.projectId ?? projects[0]?.id ?? '')
  const [type, setType] = useState<CreativeSession['type']>(session.type)
  const [minutes, setMinutes] = useState(session.durationMinutes)
  const [done, setDone] = useState(session.done)
  const [nextAction, setNextAction] = useState(session.nextAction)
  const [mood, setMood] = useState(session.mood)

  return (
    <article className="card finish-panel">
      <h2>编辑记录</h2>
      <div className="two-column-form"><label>日期<input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} /></label><label>分钟<input type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label></div>
      <label>类型<select value={type} onChange={(event) => setType(event.target.value as CreativeSession['type'])}>{[...CREATIVE_TYPES, '健身'].map((item) => <option key={item}>{item}</option>)}</select></label>
      {type !== '健身' && <label>项目<select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
      <label>推进了什么<textarea value={done} onChange={(event) => setDone(event.target.value)} /></label>
      <label>下一次从哪里继续<textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></label>
      <label>进入状态<input value={mood} onChange={(event) => setMood(event.target.value)} placeholder="例如：很沉浸" /></label>
      <div className="button-row"><button className="secondary-button" type="button" onClick={close}>取消</button><button className="primary-button" type="button" disabled={type !== '健身' && !projectId} onClick={() => void save({ dateKey, projectId: type === '健身' ? null : projectId, type, minutes, done, nextAction, mood })}>保存修改</button></div>
    </article>
  )
}

function inferPeriods(item: WeekPlanItem): DayPeriod[] {
  if (Array.isArray(item.periods)) return item.periods
  if (!item.start && !item.end) return []
  const start = Number(item.start.slice(0, 2))
  const end = Number(item.end.slice(0, 2))
  const periods: DayPeriod[] = []
  if (start < 12) periods.push('上午')
  if (start < 18 && end > 12) periods.push('下午')
  if (start >= 18 || end > 18) periods.push('晚上')
  return periods
}

function normalizePlan(plan: WeekPlanItem[]): WeekPlanItem[] {
  return plan.map((item) => ({ ...item, periods: inferPeriods(item), countsAsPlannedNode: item.type === '创作' }))
}

function PlanPage() {
  const plan = useAppStore((state) => state.weekPlan)
  const saveWeekPlan = useAppStore((state) => state.saveWeekPlan)
  const [draft, setDraft] = useState(() => normalizePlan(plan))
  const [selectedDay, setSelectedDay] = useState(0)
  const normalized = normalizePlan(plan)
  const changed = JSON.stringify(draft) !== JSON.stringify(normalized)
  const selected = draft[selectedDay]

  useEffect(() => setDraft(normalizePlan(plan)), [plan])

  function updateSelected(update: Partial<WeekPlanItem>) {
    setDraft((items) => items.map((item, index) => index === selectedDay ? { ...item, ...update } : item))
  }

  function chooseType(type: WeekPlanItem['type']) {
    updateSelected({ type, countsAsPlannedNode: type === '创作', periods: type === '自由' || type === '休息' ? [] : selected.periods })
  }

  function togglePeriod(period: DayPeriod) {
    const periods = selected.periods.includes(period) ? selected.periods.filter((item) => item !== period) : [...selected.periods, period]
    updateSelected({ periods })
  }

  return (
    <PageFrame eyebrow="计划是边界，不是考勤" title="本周计划" image="hero4.jpg">
      <article className="card weekly-goal-card">
        <p className="eyebrow">本周创作边界</p>
        <h2>工作日 2 次连接 · 周末留出一天半</h2>
        <p>工作日每次专注 1 小时，周末合计保留 12 小时；临时计划外创作也会如实计入实际节点。</p>
      </article>
      <article className="card weekly-planner">
        <div className="week-calendar" aria-label="选择要设置的日期">
          {draft.map((item, index) => {
            const type = PLAN_TYPES.find((option) => option.value === item.type) ?? PLAN_TYPES[0]
            return <button key={item.id} className={`calendar-day ${selectedDay === index ? 'selected' : ''}`} type="button" onClick={() => setSelectedDay(index)}><b>{item.dayLabel.slice(1)}</b><span>{type.icon}</span><small>{type.label}</small></button>
          })}
        </div>
        {selected && <div className="day-plan-editor">
          <div><p className="eyebrow">{addDaysKey(selected.weekStart, selected.dayIndex)}</p><h2>设置{selected.dayLabel}</h2></div>
          <fieldset><legend>这一天是什么日子？</legend><div className="plan-choice-grid">{PLAN_TYPES.map((option) => <button key={option.value} className={selected.type === option.value ? 'selected' : ''} type="button" onClick={() => chooseType(option.value)}><span>{option.icon}</span>{option.label}</button>)}</div></fieldset>
          {selected.type !== '自由' && selected.type !== '休息' && <fieldset><legend>大概安排在什么时候？可多选</legend><div className="period-choice-grid">{DAY_PERIODS.map((period) => <button key={period} className={selected.periods.includes(period) ? 'selected' : ''} type="button" onClick={() => togglePeriod(period)}>{period}</button>)}</div></fieldset>}
          <p className="plan-hint">{selected.type === '创作' ? (selected.dayIndex < 5 ? '工作日创作连接：默认目标 1 小时。' : '周末创作：两天合计留出 12 小时，约一天半。') : '只标记大致时段，不要求按分钟执行。'}</p>
        </div>}
        <button className="primary-button save-week-button" type="button" disabled={!changed} onClick={() => void saveWeekPlan(draft)}>{changed ? '保存本周计划' : '本周计划已保存'}</button>
      </article>
    </PageFrame>
  )
}

function ReviewPage() {
  const projects = useAppStore((state) => state.projects)
  const sessions = useAppStore((state) => state.sessions)
  const weekPlan = useAppStore((state) => state.weekPlan)
  const review = useAppStore((state) => state.weekReview)
  const saveReview = useAppStore((state) => state.saveReview)
  const [done, setDone] = useState(review?.done ?? '')
  const [nextWeekGoal, setNextWeekGoal] = useState(review?.nextWeekGoal ?? '')
  const [saved, setSaved] = useState(false)
  const weekStart = getWeekStart(Date.now())
  const summary = summarizeWeek(sessions, weekStart)
  const inWeek = sessions.filter((session) => session.weekStart === weekStart && session.type !== '健身')
  const byType = groupMinutes(inWeek, (session) => session.type)
  const byProject = groupMinutes(inWeek, (session) => projects.find((project) => project.id === session.projectId)?.name ?? '未归属项目')
  const streak = passingWeekStreak(sessions, weekStart)
  const easiestSlot = mostProductiveSlot(inWeek)
  const missedSlot = firstMissedCreativeSlot(weekPlan, summary.nodeDateKeys)

  useEffect(() => {
    setDone(review?.done ?? '')
    setNextWeekGoal(review?.nextWeekGoal ?? '')
    setSaved(false)
  }, [review])

  async function submitReview() {
    await saveReview(done, nextWeekGoal)
    setSaved(true)
  }

  return (
    <>
      <header className="review-hero-v2" style={{ backgroundImage: 'url("./assets/review/review-hero-v2.webp")' }}>
        <div className="review-hero-copy">
          <h1 className="review-hero-title">本 周 复 盘</h1>
          <p className="review-hero-subtitle">回头看见走过的星光</p>
          <span className="review-hero-divider" aria-hidden="true">✦</span>
          <blockquote>“你为热爱的事，<br />悄悄坚持着，<br />世界会记得。”</blockquote>
        </div>
      </header>

      <section className="review-page-stack">
        <section className={`review-achievement ${summary.passed ? 'passed' : ''}`}>
          <img src="./assets/review/star.webp" alt="" aria-hidden="true" />
          <div><h2>{summary.passed ? '本周已达标' : '本周仍在生长'}</h2><p>4 个创作节点 ＋ 累计 14 小时</p></div>
          <strong>{streak > 0 ? `连续第 ${streak} 周` : '继续靠近'}</strong>
        </section>

        <section className="review-orbit-section" aria-labelledby="review-stars-heading">
          <h2 id="review-stars-heading">这一周留下的星光</h2>
          <div className="review-orbit" aria-label="本周四项统计">
            <ReviewOrbitMetric className="orbit-one" image="creative.webp" label="创作节点" value={`${summary.nodeCount} / 4`} />
            <ReviewOrbitMetric className="orbit-two" image="clock.webp" label="累计时长" value={formatMinutes(summary.creativeMinutes)} />
            <ReviewOrbitMetric className="orbit-three" image="gym.webp" label="健身记录" value={`${summary.gymCount} 次`} />
            <ReviewOrbitMetric className="orbit-four" image="star.webp" label="连续达标" value={`${streak} 周`} />
          </div>
        </section>

        <ReviewTimeBreakdown items={byType} />
        <ReviewProjectBreakdown items={byProject} />

        <section className="review-rhythm" aria-labelledby="review-rhythm-heading">
          <h2 id="review-rhythm-heading">这一周的创作节律</h2>
          <div className="review-rhythm-grid">
            <article><span>✦ 最容易进入状态</span><strong>{easiestSlot}</strong><img src="./assets/review/comet.webp" alt="" aria-hidden="true" /></article>
            <article><span>✦ 最容易失约</span><strong>{missedSlot}</strong><span className="review-crescent" aria-hidden="true">☾</span></article>
          </div>
        </section>

        <section className="review-journal" aria-labelledby="review-journal-heading">
          <h2 id="review-journal-heading">把这一周写进星球日记</h2>
          <div className="review-journal-paper">
            <img src="./assets/review/book.webp" alt="" aria-hidden="true" />
            <label><span>✦ 这周我做成了什么</span><textarea value={done} placeholder="写下这一周真正向前推进的部分……" onChange={(event) => { setDone(event.target.value); setSaved(false) }} /></label>
            <label><span>✦ 下周最重要的一个作品增量</span><textarea value={nextWeekGoal} placeholder="不用很多，只写下一件最重要的事……" onChange={(event) => { setNextWeekGoal(event.target.value); setSaved(false) }} /></label>
            <button className="primary-button review-save-button" type="button" onClick={() => void submitReview()}>{saved ? '这一周已收好' : '保存本周复盘'}</button>
          </div>
        </section>
      </section>
    </>
  )
}

function groupMinutes(sessions: CreativeSession[], key: (session: CreativeSession) => string): Array<[string, number]> {
  const groups = new Map<string, number>()
  sessions.forEach((session) => groups.set(key(session), (groups.get(key(session)) ?? 0) + session.durationMinutes))
  return [...groups.entries()].sort((a, b) => b[1] - a[1])
}

function ReviewOrbitMetric({ className, image, label, value }: { className: string; image: string; label: string; value: string }) {
  return <div className={`review-orbit-metric ${className}`}><img src={`./assets/review/${image}`} alt="" aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>
}

const REVIEW_COLORS = ['#8d84d8', '#5c9fe1', '#69a8b5', '#71ae8e', '#e7b24c']

function ReviewTimeBreakdown({ items }: { items: Array<[string, number]> }) {
  const visible = items.slice(0, 5)
  const total = visible.reduce((sum, [, minutes]) => sum + minutes, 0)
  return (
    <section className="review-time-section" aria-labelledby="review-time-heading">
      <div className="review-section-title"><h2 id="review-time-heading">时间去了哪里</h2><span>{formatMinutes(total)}</span></div>
      {visible.length ? <div className="review-time-list">{visible.map(([label, minutes], index) => (
        <div className="review-time-row" key={label}>
          <span className="review-time-icon" aria-hidden="true">{['🪶', '📖', '✦', '◉', '⭐'][index]}</span>
          <b>{label}</b>
          <div className="review-time-track"><i style={{ width: `${Math.max(7, total ? minutes / total * 100 : 0)}%`, background: REVIEW_COLORS[index] }} /></div>
          <span>{formatMinutes(minutes)}</span>
        </div>
      ))}</div> : <p className="empty-copy">本周还没有创作记录，下一次连接会从这里亮起。</p>}
    </section>
  )
}

function ReviewProjectBreakdown({ items }: { items: Array<[string, number]> }) {
  const visible = items.slice(0, 5)
  const total = visible.reduce((sum, [, minutes]) => sum + minutes, 0)
  let cursor = 0
  const segments = visible.map(([, minutes], index) => {
    const start = cursor
    cursor += total ? minutes / total * 100 : 0
    return `${REVIEW_COLORS[index]} ${start}% ${cursor}%`
  })
  const ringBackground = segments.length ? `conic-gradient(${segments.join(', ')})` : 'conic-gradient(#dce8f1 0 100%)'
  return (
    <section className="review-project-section" aria-labelledby="review-project-heading">
      <div className="review-section-title"><h2 id="review-project-heading">项目投入</h2><span>按专注时长</span></div>
      <div className="review-project-content">
        <div className="review-project-ring" style={{ background: ringBackground }}><img src="./assets/review/planet.webp" alt="" aria-hidden="true" /></div>
        {visible.length ? <div className="review-project-legend">{visible.map(([label, minutes], index) => (
          <div key={label}><i style={{ background: REVIEW_COLORS[index] }} /><span><b>{label}</b><small>{formatMinutes(minutes)} · {Math.round(minutes / total * 100)}%</small></span></div>
        ))}</div> : <p className="empty-copy">还没有项目投入记录。</p>}
      </div>
    </section>
  )
}

function passingWeekStreak(sessions: CreativeSession[], currentWeek: string): number {
  let streak = 0
  let week = currentWeek
  while (summarizeWeek(sessions, week).passed) {
    streak += 1
    week = addDaysKey(week, -7)
  }
  return streak
}

function mostProductiveSlot(sessions: CreativeSession[]): string {
  if (!sessions.length) return '等待第一次连接'
  const groups = new Map<string, number>()
  sessions.forEach((session) => {
    const date = new Date(`${session.dateKey}T00:00:00Z`)
    const day = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getUTCDay()]
    const hour = new Date(session.startedAt).getHours()
    const period = hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上'
    const label = `${day}${period}`
    groups.set(label, (groups.get(label) ?? 0) + session.durationMinutes)
  })
  return [...groups.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function firstMissedCreativeSlot(plan: WeekPlanItem[], completedDateKeys: string[]): string {
  const completed = new Set(completedDateKeys)
  const missed = plan.find((item) => item.type === '创作' && !completed.has(weekDateKey(item)))
  if (!missed) return '没有失约'
  return `${missed.dayLabel}${missed.periods[0] ?? ''}`
}

function SessionLine({ session, projects }: { session: CreativeSession; projects: Project[] }) {
  const project = projects.find((item) => item.id === session.projectId)
  return (
    <div className="session-line">
      <span className="session-date">{session.dateKey.slice(5)}</span>
      <div><b>{session.type}{project ? ` · ${project.name}` : ''}</b><small>{session.done || session.goal || '留下了一次创作连接'}</small></div>
      <strong>{formatMinutes(session.durationMinutes)}</strong>
    </div>
  )
}

function PageFrame({ eyebrow, title, image, children }: { eyebrow: string; title: string; image: string; children: ReactNode }) {
  return (
    <>
      <header className="page-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(237,245,251,.38), rgba(237,245,251,.9)), url("./assets/${image}")` }}>
        <p>{eyebrow}</p><h1>{title}</h1>
      </header>
      <section className="content-stack">{children}</section>
    </>
  )
}

export default App
