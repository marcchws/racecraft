import { delay, http, HttpResponse } from 'msw'
import type { ApiError, MeResponse, NewPlanRequest, PlanResponse, ProgressResponse, ProgressWeek, Range, RaceHead, TodayResponse, WeekSummary, WeekView, WorkoutResponse } from '@/api/types'
import { applyMiss, moveWorkout } from '@/domain/adjust'
import { addDays, daysBetween, dayShort, fmtDate, mondayOf, weekday } from '@/domain/dates'
import { daysProblem, estimateFinish, raceProblem, startKmOf } from '@/domain/estimate'
import { buildPlan, findWorkout, weekOfDate } from '@/domain/plan'
import { round1 } from '@/domain/rng'
import type { Feel, Plan, Week, Weekday } from '@/domain/types'
import { isRun } from '@/domain/workouts'
import { db } from './db'

const latency = async () => {
  if (db.hang) return delay('infinite')
  // Milliseconds: 150–400 live, 1.5–3 s on the slow network.
  const [lo, hi] = db.scenario === 'slow' ? [1500, 3000] : [150, 400]
  return delay(lo + Math.random() * (hi - lo))
}
const fail = (status: number, error: string, message: string) => HttpResponse.json(<ApiError>{ error, message }, { status })
const failing = () => db.scenario === 'errors'
const noPlan = () => fail(404, 'no-plan', 'There is no plan yet.')
const serverDown = () => fail(500, 'server', 'The plan service did not answer.')

const doneKmOf = (week: Week) => round1(db.runs.filter((r) => r.date >= week.start && r.date <= addDays(week.start, 6)).reduce((t, r) => t + r.km, 0))
const currentWeekOf = (plan: Plan) => weekOfDate(plan, db.now.date)?.n ?? (db.now.date < plan.weeks[0]!.start ? 1 : plan.weeks.length)

function summaries(plan: Plan): WeekSummary[] {
  const current = currentWeekOf(plan)
  return plan.weeks.map((w) => ({
    n: w.n, start: w.start, plannedKm: w.plannedKm, doneKm: doneKmOf(w), note: w.note, current: w.n === current, past: w.n < current,
    missed: w.days.filter((d) => d.status === 'missed' || d.status === 'skipped').map((d) => `${d.status === 'missed' ? 'Missed' : 'Skipped'} ${dayShort(weekday(d.date))} ${d.kind === 'intervals' ? 'reps' : d.kind === 'tempo' ? 'tempo' : d.title.toLowerCase()}`),
  }))
}
function weekView(plan: Plan, week: Week): WeekView {
  const runs = Object.fromEntries(db.runs.filter((r) => r.workoutId && week.days.some((d) => d.id === r.workoutId)).map((r) => [r.workoutId!, r]))
  return { ...week, doneKm: doneKmOf(week), current: week.n === currentWeekOf(plan), runs }
}
function head(plan: Plan): RaceHead {
  const latest = [...db.runs].sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1)
  return {
    race: plan.race, daysLeft: daysBetween(db.now.date, plan.race.date), goal: plan.goal, goalPace: plan.goalPace,
    predicted: latest?.predicted ?? plan.goal, currentWeek: currentWeekOf(plan), weeksTotal: plan.weeks.length,
  }
}

function progress(range: Range): ProgressResponse {
  const plan = db.plan
  const thisMonday = mondayOf(db.now.date)
  const count = range === '4w' ? 4 : range === '3m' ? 14 : plan ? currentWeekOf(plan) : 6
  const first = range === 'plan' && plan ? plan.weeks[0]!.start : addDays(thisMonday, -(count - 1) * 7)
  const weeks: ProgressWeek[] = []
  for (let i = 0; i < count; i++) {
    const start = addDays(first, i * 7), end = addDays(start, 6)
    const pw = plan?.weeks.find((w) => w.start === start)
    const runs = db.runs.filter((r) => r.date >= start && r.date <= end && r.date <= db.now.date)
    const easy = runs.filter((r) => r.kind === 'easy' || r.kind === 'long')
    weeks.push({
      key: start, label: pw ? String(pw.n) : fmtDate(start), title: pw ? `Week ${pw.n}` : `Week of ${fmtDate(start)}`,
      plannedKm: pw?.plannedKm ?? null, doneKm: round1(runs.reduce((t, r) => t + r.km, 0)),
      easyPace: easy.length ? Math.round(easy.reduce((t, r) => t + r.pace, 0) / easy.length) : null,
      predicted: runs.length ? runs.at(-1)!.predicted : null,
      note: (plan && pw && summaries(plan)[pw.n - 1]!.missed[0]) || pw?.note, current: start === thisMonday,
    })
  }
  const span = [first, addDays(first, count * 7 - 1)]
  const planned = plan ? plan.weeks.flatMap((w) => w.days).filter((d) => isRun(d) && d.date >= span[0]! && d.date <= span[1]! && (d.date < db.now.date || d.status === 'done') && !d.movedFrom) : []
  return {
    now: db.now, range, weeks,
    consistency: { done: planned.filter((d) => d.status === 'done').length, planned: planned.length, missed: planned.filter((d) => d.status === 'missed' || d.status === 'skipped').map((d) => `Week ${d.week} ${d.kind === 'tempo' ? 'tempo' : d.title}`) },
    runs: [...db.runs].filter((r) => r.date >= span[0]! && r.date <= db.now.date).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8),
    goal: plan?.goal ?? null, hasPlan: !!plan,
  }
}

const body = async <T>(request: Request) => (await request.json().catch(() => ({}))) as T

export const handlers = [
  http.get('/api/today', async () => {
    await latency()
    if (failing()) return serverDown()
    const plan = db.plan
    if (!plan) return noPlan()
    const week = weekOfDate(plan, db.now.date) ?? plan.weeks[0]!
    const today = week.days.find((d) => d.date === db.now.date) ?? week.days[0]!
    const after = plan.weeks.flatMap((w) => w.days).find((d) => d.date > db.now.date && isRun(d) && d.status === 'planned') ?? null
    const run = db.runs.find((r) => r.workoutId === today.id) ?? null
    const adjustment = plan.adjustments.filter((a) => a.week === week.n).at(-1) ?? null
    return HttpResponse.json(<TodayResponse>{
      ...head(plan), now: db.now, runner: db.runner, week: weekView(plan, week), weeks: summaries(plan),
      today, next: after, run, adjustment, watch: db.watch,
    })
  }),

  http.get('/api/plan', async () => {
    await latency()
    if (failing()) return serverDown()
    if (!db.plan) return noPlan()
    return HttpResponse.json(<PlanResponse>{ ...head(db.plan), now: db.now, weeks: summaries(db.plan), plan: db.plan })
  }),

  http.get('/api/plan/weeks/:n', async ({ params }) => {
    await latency()
    if (failing()) return serverDown()
    if (!db.plan) return noPlan()
    const week = db.plan.weeks.find((w) => w.n === Number(params.n))
    if (!week) return fail(404, 'no-week', `There is no week ${String(params.n)}.`)
    return HttpResponse.json(<WeekView>weekView(db.plan, week))
  }),

  http.patch('/api/plan', async ({ request }) => {
    await latency()
    if (failing()) return serverDown()
    if (!db.plan || !db.planInput) return noPlan()
    const { runDays, longDay } = await body<{ runDays: Weekday[]; longDay: Weekday }>(request)
    const problem = daysProblem(runDays, longDay)
    if (problem) return fail(422, 'days', problem)
    const current = currentWeekOf(db.plan)
    const rebuilt = buildPlan({ ...db.planInput, runDays, longDay })
    db.plan = { ...db.plan, runDays: rebuilt.runDays, longDay, weeks: db.plan.weeks.map((w) => (w.n > current ? rebuilt.weeks[w.n - 1]! : w)) }
    db.planInput = { ...db.planInput, runDays, longDay }
    return HttpResponse.json({ from: current + 1, to: db.plan.weeks.length })
  }),

  http.get('/api/workouts/:id', async ({ params }) => {
    await latency()
    if (failing()) return serverDown()
    if (!db.plan) return noPlan()
    const workout = findWorkout(db.plan, String(params.id))
    if (!workout) return fail(404, 'no-workout', 'There is no such workout in your plan.')
    const week = db.plan.weeks.find((w) => w.n === workout.week)!
    return HttpResponse.json(<WorkoutResponse>{ now: db.now, workout, run: db.runs.find((r) => r.workoutId === workout.id) ?? null, week, watch: db.watch })
  }),

  http.post('/api/workouts/:id/send', async ({ params, request }) => {
    await latency()
    const { undo } = await body<{ undo?: boolean }>(request)
    if (db.watch.failing || failing()) return fail(503, 'watch', "Couldn't reach your watch.")
    const w = db.plan && findWorkout(db.plan, String(params.id))
    if (!w) return fail(404, 'no-workout', 'There is no such workout in your plan.')
    w.sentToWatch = !undo
    return HttpResponse.json(w)
  }),

  http.post('/api/workouts/:id/skip', async ({ params, request }) => {
    await latency()
    if (failing()) return serverDown()
    if (!db.plan) return noPlan()
    const id = String(params.id), { undo } = await body<{ undo?: boolean }>(request)
    if (undo) {
      const before = db.undo.get(`skip:${id}`)
      if (before) db.plan = before
      db.undo.delete(`skip:${id}`)
      return HttpResponse.json({ adjustment: null })
    }
    db.undo.set(`skip:${id}`, db.plan)
    const { plan, adjustment } = applyMiss(db.plan, id, 'skipped', db.now)
    db.plan = plan
    return HttpResponse.json({ adjustment })
  }),

  http.post('/api/workouts/:id/move', async ({ params, request }) => {
    await latency()
    if (failing()) return serverDown()
    if (!db.plan) return noPlan()
    const id = String(params.id), { to } = await body<{ to: string }>(request)
    try {
      db.plan = moveWorkout(db.plan, id, to)
    } catch (e) {
      return fail(422, 'move', (e as Error).message)
    }
    return HttpResponse.json(findWorkout(db.plan, id))
  }),

  http.post('/api/runs/:id/feel', async ({ params, request }) => {
    await latency()
    if (failing()) return serverDown()
    const run = db.runs.find((r) => r.id === params.id)
    if (!run) return fail(404, 'no-run', 'There is no such run.')
    const { feel } = await body<{ feel: Feel | null }>(request)
    if (feel) run.feel = feel
    else delete run.feel
    return HttpResponse.json(run)
  }),

  http.get('/api/progress', async ({ request }) => {
    await latency()
    if (failing()) return serverDown()
    const range = (new URL(request.url).searchParams.get('range') ?? 'plan') as Range
    return HttpResponse.json(<ProgressResponse>progress(['plan', '4w', '3m'].includes(range) ? range : 'plan'))
  }),

  http.get('/api/races', async () => {
    await latency()
    return HttpResponse.json(db.races)
  }),

  http.post('/api/plans', async ({ request }) => {
    if (db.hang) return delay('infinite')
    // Building takes about 1.5 s, so the wait reads as work; on the slow network, 6 s.
    await delay(db.scenario === 'slow' ? 6000 : 1500)
    if (failing()) return serverDown()
    const req = await body<NewPlanRequest>(request)
    const race = 'id' in req.race
      ? db.races.find((r) => r.id === (req.race as { id: string }).id)
      : { id: 'own', name: req.race.name, city: '', date: req.race.date, distance: req.race.distance, km: { '5K': 5, '10K': 10, Half: 21.1 }[req.race.distance] }
    if (!race) return fail(422, 'race', 'Pick a race.')
    const problem = raceProblem(db.now, race.distance, race.date, race.name) ?? daysProblem(req.runDays, req.longDay)
    if (problem) return fail(422, 'rules', problem)
    const id = `plan-${Date.now()}`
    const input = {
      id, idPrefix: `${id}-`, race, start: mondayOf(db.now.date), firstDay: db.now.date,
      goal: estimateFinish(req.level, race.distance), runDays: req.runDays, longDay: req.longDay, startKm: startKmOf(req.level),
    }
    db.plan = buildPlan(input)
    db.planInput = input
    return HttpResponse.json({ id: db.plan.id }, { status: 201 })
  }),

  http.get('/api/watch', async () => {
    await latency()
    return HttpResponse.json(db.watch)
  }),

  http.post('/api/watch/connect', async () => {
    await latency()
    db.watch = { ...db.watch, connected: true, lastSync: db.now }
    return HttpResponse.json(db.watch)
  }),

  http.post('/api/watch/sync', async () => {
    await latency()
    await delay(600)
    if (db.watch.failing || failing()) return fail(503, 'watch', "Couldn't reach your watch.")
    db.watch = { ...db.watch, lastSync: db.now }
    return HttpResponse.json({ watch: db.watch, newRuns: 0 })
  }),

  http.get('/api/me', async () => {
    await latency()
    const plan = db.plan
    return HttpResponse.json(<MeResponse>{
      now: db.now, runner: db.runner, watch: db.watch,
      plan: plan ? { runDays: plan.runDays, longDay: plan.longDay, currentWeek: currentWeekOf(plan), weeksTotal: plan.weeks.length } : null,
    })
  }),
]
