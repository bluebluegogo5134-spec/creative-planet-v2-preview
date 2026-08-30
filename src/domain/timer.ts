import type { CreativeType, TimerState } from './model'

export interface StartTimerInput {
  projectId: string
  type: CreativeType
  goal: string
}

function requireStatus<T extends TimerState['status']>(
  state: TimerState,
  status: T
): asserts state is Extract<TimerState, { status: T }> {
  if (state.status !== status) {
    throw new Error(`Timer must be ${status}; received ${state.status}`)
  }
}

export function startTimer(input: StartTimerInput, now: number, timerId: string): TimerState {
  return {
    status: 'running',
    timerId,
    projectId: input.projectId,
    type: input.type,
    goal: input.goal.trim(),
    startedAt: now,
    pausedDurationMs: 0
  }
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  requireStatus(state, 'running')
  if (now < state.startedAt) throw new Error('Pause time cannot be before start time')
  return { ...state, status: 'paused', pausedAt: now }
}

export function resumeTimer(state: TimerState, now: number): TimerState {
  requireStatus(state, 'paused')
  if (now < state.pausedAt) throw new Error('Resume time cannot be before pause time')
  const { pausedAt, ...details } = state
  return {
    ...details,
    status: 'running',
    pausedDurationMs: state.pausedDurationMs + (now - pausedAt)
  }
}

export function getElapsedMs(state: TimerState, now: number): number {
  if (state.status === 'idle') return 0
  const effectiveNow = state.status === 'paused' ? state.pausedAt : now
  return Math.max(0, effectiveNow - state.startedAt - state.pausedDurationMs)
}

export function finishTimer(state: TimerState, now: number): { durationMs: number; endedAt: number } {
  if (state.status === 'idle') throw new Error('Cannot finish an idle timer')
  return { durationMs: getElapsedMs(state, now), endedAt: now }
}
