import type { Level } from '@/api/types'
import { daysBetween, fmtDate, mondayOf } from './dates'
import { halfPaceFromWeeklyKm, RACE_KM, riegel } from './pace'
import { MAX_WEEKS, MIN_WEEKS } from './plan'
import type { Now, RaceDistance, Weekday } from './types'

/** Plan weeks from this Monday to race week, both counted. */
export const weeksUntil = (now: Now, raceDate: string) => Math.floor(daysBetween(mondayOf(now.date), mondayOf(raceDate)) / 7) + 1

/** The starting estimate for the race: Riegel from a recent race, or the weekly-km guess. Rounded to 10 s. */
export function estimateFinish(level: Level, distance: RaceDistance) {
  const toKm = RACE_KM[distance]
  const s = level.kind === 'race'
    ? riegel(level.time, RACE_KM[level.distance], toKm)
    : riegel(halfPaceFromWeeklyKm(level.km) * RACE_KM.Half, RACE_KM.Half, toKm)
  return Math.round(s / 10) * 10
}

/** Weekly km the plan starts from: what she runs now, or a typical week for someone racing that distance. */
export const startKmOf = (level: Level) => (level.kind === 'km' ? level.km : { '5K': 15, '10K': 20, Half: 25 }[level.distance])

/** The race rule: far enough for the distance, near enough for one plan. Null when it holds. */
export function raceProblem(now: Now, distance: RaceDistance, date: string, name = 'That race') {
  if (date <= now.date) return 'Pick a date after today.'
  const weeks = weeksUntil(now, date)
  const min = MIN_WEEKS[distance]
  const label = distance === 'Half' ? 'A half marathon' : `A ${distance}`
  if (weeks < min) return `${name} is ${weeks} ${weeks === 1 ? 'week' : 'weeks'} away. ${label} needs at least ${min}: pick a later race or date.`
  if (weeks > MAX_WEEKS) return `${name} is ${weeks} weeks away. Plans run up to ${MAX_WEEKS} weeks: pick a race before ${fmtDate(lastDate(now))}.`
  return null
}
const lastDate = (now: Now) => {
  const monday = mondayOf(now.date)
  const [y, m, d] = monday.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + MAX_WEEKS * 7 - 1)).toISOString().slice(0, 10)
}

export function daysProblem(runDays: Weekday[], longDay: Weekday | null) {
  if (runDays.length < 3) return `Pick at least three run days. You have ${runDays.length === 0 ? 'none' : runDays.length === 1 ? 'one' : 'two'}.`
  if (longDay === null || !runDays.includes(longDay)) return 'Pick your long-run day from your run days.'
  return null
}

export function levelProblem(level: Partial<{ kind: 'race' | 'km'; time: number | null; km: number | null }>) {
  if (level.kind === 'race') {
    if (level.time == null) return 'Enter a time like 52:30 or 1:58:00.'
    if (level.time < 12 * 60 || level.time > 4 * 3600) return 'That time looks off. Enter it as minutes:seconds or hours:minutes:seconds.'
  }
  if (level.kind === 'km') {
    if (level.km == null || Number.isNaN(level.km)) return 'Enter the km you run in a usual week.'
    if (level.km < 5) return 'Plans start from 5 km a week. Build up to that first, then come back.'
    if (level.km > 120) return 'Enter a usual week, under 120 km.'
  }
  return null
}
