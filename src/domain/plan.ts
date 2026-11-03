import { addDays, daysBetween, dayName, mondayOf, weekday } from './dates'
import { fmtPace, pacesFromGoal } from './pace'
import { round1 } from './rng'
import type { Plan, Race, Week, WeekNote, Weekday, Workout } from './types'
import { easy, intervals, long, race, rest, tempo } from './workouts'

/**
 * The plan template: twelve weeks toward a half marathon, one row per week, for a runner who starts at 22 km a
 * week on four days. Three build weeks and a recovery week, twice; then the peak, the taper and race week.
 * Each row sums to that week's km: 22, 25, 28, 23, 30, 34, 40, 32, 42, 44, 30, 28.
 */
interface Row {
  reps?: [count: number, meters: number]
  racePace?: number
  mid: { tempo: number } | { easy: number }
  easy: number
  long: number
  note?: WeekNote
}
export const TEMPLATE: Row[] = [
  { reps: [4, 400], mid: { easy: 5.0 }, easy: 3.8, long: 7 },
  { reps: [5, 400], mid: { tempo: 3 }, easy: 4.0, long: 8 },
  { reps: [5, 600], mid: { easy: 5.5 }, easy: 4.5, long: 10 },
  { reps: [4, 600], mid: { easy: 4.5 }, easy: 3.5, long: 8, note: 'Recovery week' },
  { reps: [6, 600], mid: { tempo: 4 }, easy: 4.0, long: 10 },
  { reps: [5, 800], mid: { tempo: 5 }, easy: 4.0, long: 13 },
  { reps: [6, 800], mid: { easy: 8.0 }, easy: 5.8, long: 16 },
  { reps: [4, 800], mid: { easy: 6.5 }, easy: 5.7, long: 12, note: 'Recovery week' },
  { reps: [5, 1000], mid: { tempo: 6 }, easy: 6.0, long: 17 },
  { reps: [6, 1000], mid: { tempo: 6 }, easy: 5.6, long: 18, note: 'Peak week' },
  { reps: [4, 800], mid: { easy: 5.5 }, easy: 4.7, long: 12, note: 'Taper' },
  { racePace: 2, mid: { easy: 2.5 }, easy: 0, long: 0, note: 'Race week' },
]
export const TEMPLATE_START_KM = 22
/** The longest long run each race needs, km. */
const LONG_CAP = { '5K': 10, '10K': 14, Half: 18 } as const
/** The fewest weeks a plan needs before each race. */
export const MIN_WEEKS = { '5K': 4, '10K': 6, Half: 8 } as const
export const MAX_WEEKS = 16

export interface PlanInput {
  id: string
  race: Race
  /** Monday of week 1. */
  start: string
  goal: number
  runDays: Weekday[]
  longDay: Weekday
  /** The runner's weekly km today. The template scales from it. */
  startKm: number
  /** Days before this one in week 1 are already past and stay rest. */
  firstDay?: string
  /** Keeps a new plan's workout ids apart from an earlier plan's, whose synced runs still point at theirs. */
  idPrefix?: string
}

const NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

function repsWhy(row: Row, prev: Row | undefined, goalPace: number) {
  const lead = `Reps 13 s faster than your goal pace make ${fmtPace(goalPace)} feel easier on race day.`
  const [n, m] = row.reps!
  if (row.note === 'Recovery week') return `${lead} A shorter set: this is a recovery week.`
  if (row.note === 'Taper') return `${lead} Fewer reps now, so you arrive fresh.`
  if (!prev?.reps) return `${lead} The first set of the plan: hold the pace, no faster.`
  const [pn, pm] = prev.reps
  if (m > pm) return `${lead} Each rep is ${m - pm} m longer than last week's.`
  if (n > pn) return `${lead} ${NUM[n] ?? n} is ${n - pn === 1 ? 'one' : NUM[n - pn]?.toLowerCase()} more than last week.`
  return `${lead} The same set as last week.`
}

/** Builds every week from the template, scaled to the runner's km and fitted to her run days and weeks. */
export function buildPlan(input: PlanInput): Plan {
  const { race: r, start, goal, longDay } = input
  // Truncated, as a watch shows pace: 1:52:00 over 21.0975 km is 5:18.5, read as 5:18.
  const goalPace = Math.floor(goal / (r.distance === 'Half' ? 21.0975 : r.km))
  const p = pacesFromGoal(goalPace)
  const weeksCount = Math.floor(daysBetween(start, mondayOf(r.date)) / 7) + 1
  // Fewer weeks than the template drop its first rows; more weeks repeat its first row as base weeks.
  const rows: Row[] = weeksCount <= TEMPLATE.length
    ? TEMPLATE.slice(TEMPLATE.length - weeksCount)
    : [...Array.from({ length: weeksCount - TEMPLATE.length }, () => TEMPLATE[0]!), ...TEMPLATE]
  const scale = input.startKm / TEMPLATE_START_KM
  const sized = (km: number) => Math.max(2, round1(km * scale))
  const others = [...input.runDays].filter((d) => d !== longDay).sort((a, b) => a - b)
  const [quality, mid, easyDay, ...extra] = others

  const weeks: Week[] = rows.map((row, i) => {
    const n = i + 1, monday = addDays(start, i * 7)
    const days: Workout[] = []
    for (let d = 0 as Weekday; d < 7; d = (d + 1) as Weekday) {
      const date = addDays(monday, d)
      const base = { id: `${input.idPrefix ?? ''}w${n}-${dayName(d).slice(0, 3).toLowerCase()}`, week: n, date }
      const isRace = date === r.date
      const past = input.firstDay !== undefined && date < input.firstDay
      const afterRace = date > r.date
      let w: Workout
      if (isRace) w = race(base, r.name, r.km, goalPace, `Start at ${fmtPace(goalPace + 2)} for the first 5 km, then settle into ${fmtPace(goalPace)}.`)
      else if (past || afterRace) w = rest(base)
      else if (d === quality) {
        w = row.racePace
          ? tempo(base, row.racePace, p, `Two kilometres at goal pace to remind your legs what ${fmtPace(goalPace)} feels like. Nothing more this week.`, { pace: goalPace, title: `Race pace ${row.racePace} km`, warmM: 1200, coolM: 1200 })
          : intervals(base, row.reps![0], row.reps![1], p, repsWhy(row, rows[i - 1], goalPace))
      } else if (d === mid) {
        w = 'tempo' in row.mid
          ? tempo(base, row.mid.tempo, p, `${row.mid.tempo} km at ${fmtPace(p.tempo)}, two seconds off goal pace: race effort without the race's cost.`)
          : easy(base, sized(row.mid.easy), p, row.note === 'Race week' ? 'A short shakeout. Legs loose, nothing to prove.' : 'Easy means you can talk. These kilometres build the base the reps sit on.')
      } else if (d === longDay && row.long > 0) {
        const km = Math.min(LONG_CAP[r.distance], sized(row.long))
        w = long(base, km, p, row.note === 'Taper'
          ? 'Shorter now: you keep the fitness and lose the tiredness.'
          : `${km} km at ${fmtPace(p.easy)}. Time on your feet is what carries you past the hard part on race day.`)
      } else if ((d === easyDay || extra.includes(d)) && row.easy > 0) {
        w = easy(base, d === easyDay ? sized(row.easy) : sized(4), p, row.note === 'Recovery week' ? 'A lighter week so the next block can land.' : 'Easy means you can talk. These kilometres build the base the reps sit on.')
      } else w = rest(base)
      days.push(w)
    }
    return { n, start: monday, plannedKm: weekKm(days), note: row.note, days }
  })
  return { id: input.id, race: r, goal, goalPace, runDays: [...input.runDays].sort((a, b) => a - b), longDay, weeks, adjustments: [] }
}

export const weekKm = (days: Workout[]) => round1(days.reduce((t, d) => t + d.km, 0))

export const findWorkout = (plan: Plan, id: string) => {
  for (const w of plan.weeks) for (const d of w.days) if (d.id === id) return d
  return undefined
}
export const weekOfDate = (plan: Plan, date: string) => plan.weeks.find((w) => date >= w.start && date <= addDays(w.start, 6))
export const dayOfWeek = weekday
