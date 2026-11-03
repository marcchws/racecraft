import { addDays, weekday } from './dates'
import { round1, rng } from './rng'
import type { Block, Feel, Plan, Run, Workout } from './types'

/**
 * Turns a pace profile (metres at a pace) into per-km splits: the seconds each full km took, then the part km's
 * pace. A split that spans a rep and a jog averages both, as a watch does.
 */
export function splitsOf(segments: { meters: number; pace: number }[]) {
  const splits: number[] = []
  let into = 0, t = 0
  for (const s of segments) {
    let left = s.meters
    while (left > 0) {
      const take = Math.min(left, 1000 - into)
      t += (take / 1000) * s.pace
      into += take
      left -= take
      if (into === 1000) { splits.push(Math.round(t)); into = 0; t = 0 }
    }
  }
  if (into > 0) splits.push(Math.round(t / (into / 1000)))
  return splits
}

const FEELS: Feel[] = ['Easy', 'Fine', 'Hard', 'Very hard', 'Max']
const timeAt = (r: () => number, base: number) => {
  const m = base + Math.floor(r() * 20)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export interface Trend {
  /** Km done per plan week, in order from week 1. */
  doneKm: number[]
  /** Easy and long-run pace per week, s/km. */
  easyPace: number[]
  /** Rep pace per week, s/km. */
  repPace: number[]
  /** The watch's race predictor at the end of each week, s. */
  predicted: number[]
  /** The predictor before week 1, s. */
  predictedBefore: number
}

/**
 * Luísa's synced runs, drawn with a fixed seed. Each week's runs are scaled so their km add up to that week's done
 * km, and the easy runs of a week share its easy pace (their offsets cancel), so every chart point is a number the
 * trend names.
 */
export function seedRuns(plan: Plan, trend: Trend, seed: number, until: string): Run[] {
  const r = rng(seed)
  const runs: Run[] = []
  trend.doneKm.forEach((target, i) => {
    const week = plan.weeks[i]!
    const done = week.days.filter((d) => d.kind !== 'rest' && d.status !== 'missed' && d.status !== 'skipped' && d.date < until)
    const planned = done.reduce((t, d) => t + d.km, 0)
    const kms = done.map((d) => round1((d.km * target) / planned))
    kms[kms.length - 1] = round1(target - kms.slice(0, -1).reduce((t, k) => t + k, 0))
    const easyRuns = done.filter((d) => d.kind === 'easy' || d.kind === 'long')
    const offsets = easyRuns.length === 3 ? [-4, 0, 4] : easyRuns.length === 2 ? [-3, 3] : [0]
    const easy = trend.easyPace[i]!, rep = trend.repPace[i]!
    const from = i === 0 ? trend.predictedBefore : trend.predicted[i - 1]!, to = trend.predicted[i]!
    done.forEach((w, j) => {
      const km = kms[j]!
      const pace = w.kind === 'easy' || w.kind === 'long' ? easy + offsets[easyRuns.indexOf(w)]! : 0
      const segments = profile(w, km, { easy: pace || easy, rep, tempo: rep + 17, jog: 420 + Math.round(r() * 12) })
      const seconds = Math.round(segments.reduce((t, s) => t + (s.meters / 1000) * s.pace, 0))
      const feelBias = w.kind === 'intervals' || w.kind === 'tempo' ? 2 : w.kind === 'long' ? 1 : 0
      runs.push({
        id: `run-${w.id}`, workoutId: w.id, date: w.date, syncedAt: timeAt(r, weekday(w.date) >= 5 ? 7 * 60 + 40 : 7 * 60 + 2),
        kind: w.kind, title: w.title, km, seconds, pace: Math.round(seconds / km), splits: splitsOf(segments),
        repPace: w.kind === 'intervals' ? rep : w.kind === 'tempo' ? rep + 17 : undefined,
        feel: FEELS[Math.min(4, feelBias + Math.floor(r() * 2))],
        predicted: Math.round(from + ((to - from) * (j + 1)) / done.length),
      })
    })
  })
  return runs
}

/** The pace profile of a run as the watch recorded it, its easy blocks stretched or cut to the km she ran. */
function profile(w: Workout, km: number, p: { easy: number; rep: number; tempo: number; jog: number }) {
  const hard = (b: Block) => b.kind === 'rep'
  const fixed = w.blocks.filter((b) => b.kind !== 'easy').reduce((t, b) => t + b.meters, 0)
  const easyM = w.blocks.filter((b) => b.kind === 'easy').reduce((t, b) => t + b.meters, 0)
  const stretch = easyM ? (km * 1000 - fixed) / easyM : 1
  return w.blocks.map((b) => ({
    meters: Math.round(b.kind === 'easy' ? b.meters * stretch : b.meters),
    pace: hard(b) ? (w.kind === 'tempo' ? p.tempo : p.rep) : b.kind === 'jog' ? p.jog : p.easy,
  }))
}

/**
 * Runs from before the plan, from the watch's history: three easy runs a week, so the three-month range has
 * something to show before week 1.
 */
export function seedBaseRuns(firstMonday: string, weeks: { km: number; pace: number; predicted: number }[], seed: number): Run[] {
  const r = rng(seed)
  return weeks.flatMap((wk, i) => {
    const monday = addDays(firstMonday, i * 7)
    const parts = [0.3, 0.3, 0.4]
    const kms = parts.map((f) => round1(wk.km * f))
    kms[2] = round1(wk.km - kms[0]! - kms[1]!)
    return ([1, 3, 6] as const).map((d, j) => {
      const km = kms[j]!, pace = wk.pace + (j - 1) * 3
      const seconds = Math.round(km * pace)
      const date = addDays(monday, d)
      return {
        id: `run-base-${date}`, date, syncedAt: timeAt(r, 7 * 60), kind: j === 2 ? 'long' : 'easy', title: j === 2 ? 'Long run' : 'Easy run',
        km, seconds, pace, splits: splitsOf([{ meters: km * 1000, pace }]), feel: FEELS[Math.floor(r() * 2)], predicted: wk.predicted,
      } satisfies Run
    })
  })
}
