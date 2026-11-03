import type { PlanInput } from '@/domain/plan'
import { findWorkout } from '@/domain/plan'
import { DEMO_NOW, luisaPlan, luisaRuns, RACES, RUNNER, todaysRun, WATCH } from '@/domain/seed'
import type { Now, Plan, Race, Run, Runner, WatchConnection } from '@/domain/types'

/** The Demo menu's scenarios. */
export type Scenario = 'live' | 'slow' | 'noplan' | 'watchfail' | 'errors'
/** Where the demo clock stands: before today's run, after it synced, or the next morning (a rest day). */
export type Moment = 'now' | 'done' | 'rest'

export interface Db {
  scenario: Scenario
  moment: Moment
  /** Every read waits forever, to show loading states. */
  hang: boolean
  now: Now
  runner: Runner
  plan: Plan | null
  planInput: PlanInput | null
  runs: Run[]
  watch: WatchConnection
  races: Race[]
  /** Plans before an undoable change, by the change's key. */
  undo: Map<string, Plan>
}

// The demo's whole state lives here, in the page's memory: a reload starts it over.
export const db: Db = {} as Db

export function resetDb(opts: { scenario?: Scenario; moment?: Moment; hang?: boolean } = {}) {
  const scenario = opts.scenario ?? 'live', moment = opts.moment ?? 'now'
  const now: Now = moment === 'rest' ? { date: '2026-11-04', time: '06:10' } : moment === 'done' ? { date: DEMO_NOW.date, time: '07:30' } : DEMO_NOW
  let plan: Plan | null = luisaPlan(DEMO_NOW)
  let runs = luisaRuns(plan)
  if (moment !== 'now') runs.push(todaysRun(plan))
  if (scenario === 'noplan') { plan = null; runs = [] }
  if (plan) for (const run of runs) {
    const w = run.workoutId ? findWorkout(plan, run.workoutId) : undefined
    if (w) { w.status = 'done'; w.runId = run.id }
  }
  Object.assign(db, {
    scenario, moment, hang: opts.hang ?? false, now, runner: RUNNER, plan,
    planInput: plan ? { id: plan.id, race: plan.race, start: plan.weeks[0]!.start, goal: plan.goal, runDays: plan.runDays, longDay: plan.longDay, startKm: 22 } : null,
    runs,
    watch: {
      ...WATCH,
      connected: scenario !== 'noplan',
      failing: scenario === 'watchfail',
      lastSync: moment === 'now' || scenario === 'watchfail' ? WATCH.lastSync : { date: DEMO_NOW.date, time: '07:24' },
    },
    races: RACES,
    undo: new Map(),
  } satisfies Db)
}

/** Reads the URL's ?state= once at start, so every state opens from a link. */
export function resetFromUrl(search: string) {
  const state = new URLSearchParams(search).get('state')
  const map: Record<string, Parameters<typeof resetDb>[0]> = {
    loading: { hang: true },
    done: { moment: 'done' },
    rest: { moment: 'rest' },
    syncfail: { scenario: 'watchfail' },
    error: { scenario: 'errors' },
    new: { scenario: 'noplan' },
    slow: { scenario: 'slow' },
  }
  resetDb((state && map[state]) || {})
}
