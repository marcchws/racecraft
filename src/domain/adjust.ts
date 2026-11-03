import { addDays, dayName, daysBetween, mondayOf, weekday } from './dates'
import { weekKm } from './plan'
import type { Adjustment, Now, Plan, Week, Workout } from './types'
import { isHard, nounOf } from './workouts'

const clone = (plan: Plan): Plan => structuredClone(plan)
const hardAround = (week: Week, date: string, except: string[]) =>
  week.days.filter((d) => !except.includes(d.id) && isHard(d) && Math.abs(daysBetween(d.date, date)) === 1)

/** "last Thursday's", "today's", "this Thursday's", "next Thursday's", relative to now. */
function relative(date: string, now: Now) {
  if (date === now.date) return "today's"
  const weeks = daysBetween(mondayOf(now.date), mondayOf(date)) / 7
  const day = dayName(weekday(date))
  return weeks === -1 ? `last ${day}'s` : weeks === 0 ? `this ${day}'s` : weeks === 1 ? `next ${day}'s` : `${day} ${date.slice(8).replace(/^0/, '')}'s`
}

/**
 * The adjustment rule. A missed or skipped hard session moves into the next week and replaces the easy run on its
 * weekday; when that day holds no easy run, it takes the first easy run of that week with no hard day beside it,
 * and only then one with a hard day beside it, which the message warns about. The long run is never replaced.
 * An easy run that is missed is not made up.
 */
export function applyMiss(source: Plan, workoutId: string, verb: 'missed' | 'skipped', now: Now): { plan: Plan; adjustment: Adjustment | null } {
  const plan = clone(source)
  const week = plan.weeks.find((w) => w.days.some((d) => d.id === workoutId))
  const missed = week?.days.find((d) => d.id === workoutId)
  if (!week || !missed) throw new Error(`no workout ${workoutId}`)
  missed.status = verb
  const next = plan.weeks.find((w) => w.n === week.n + 1)
  if (!isHard(missed) || missed.kind === 'race' || !next) return { plan, adjustment: null }

  const noun = nounOf(missed), plural = noun === 'reps'
  const easies = next.days.filter((d) => d.kind === 'easy' && d.status === 'planned' && d.date > now.date)
  const sameDay = easies.find((d) => weekday(d.date) === weekday(missed.date))
  const calm = easies.filter((d) => !hardAround(next, d.date, [d.id]).length)
  const target = (sameDay && !hardAround(next, sameDay.date, [sameDay.id]).length ? sameDay : undefined) ?? calm[0] ?? sameDay ?? easies[0]
  const longRun = next.days.find((d) => d.kind === 'long')
  const longNote = longRun ? `${dayName(weekday(longRun.date))}'s long run stays; ` : ''
  const id = `adj-${missed.id}`

  if (!target) {
    return {
      plan,
      adjustment: { id, missedId: missed.id, missedTitle: missed.title, missedDate: missed.date, week: next.n, message: `You ${verb} ${relative(missed.date, now)} ${noun}. Week ${next.n} has no easy run to swap, so the plan goes on without it.` },
    }
  }
  const moved: Workout = { ...structuredClone(missed), id: `${missed.id}-moved`, week: next.n, date: target.date, status: 'planned', movedFrom: { week: week.n, date: missed.date } }
  delete moved.movedTo
  delete moved.runId
  delete moved.sentToWatch
  missed.movedTo = { week: next.n, date: target.date, id: moved.id }
  next.days = next.days.map((d) => (d.id === target.id ? moved : d))
  next.plannedKm = weekKm(next.days)
  const beside = hardAround(next, target.date, [moved.id])[0]
  const warn = beside ? ` It sits next to ${relative(beside.date, now).replace(/'s$/, '')}'s ${nounOf(beside)}, so keep it controlled.` : ''
  const adjustment: Adjustment = {
    id, missedId: missed.id, missedTitle: missed.title, missedDate: missed.date, week: next.n, toId: moved.id, replacedTitle: target.title,
    message: `You ${verb} ${relative(missed.date, now)} ${noun}. ${longNote}the ${noun} ${plural ? 'replace' : 'replaces'} ${relative(target.date, now)} easy run.${warn}`,
  }
  plan.adjustments = [...plan.adjustments.filter((a) => a.id !== id), adjustment]
  return { plan, adjustment }
}

/** The days a workout can move to: rest days of its week that are not past. */
export function freeDays(week: Week, now: Now) {
  return week.days.filter((d) => d.kind === 'rest' && d.date > now.date)
}

/**
 * The back-to-back warning for a move: a hard session landing beside another hard day. It still allows the move.
 * "Tempo the day after reps: keep it easy or pick Friday."
 */
export function backToBack(week: Week, workout: Workout, toDate: string, now: Now): string | null {
  if (!isHard(workout)) return null
  const beside = hardAround(week, toDate, [workout.id])
  const first = beside[0]
  if (!first) return null
  const name = nounOf(workout)
  const label = name[0]!.toUpperCase() + name.slice(1)
  const relation = first.date < toDate ? 'the day after' : 'the day before'
  const better = freeDays(week, now).find((d) => d.date !== toDate && !hardAround(week, d.date, [workout.id]).length)
  return `${label} ${relation} ${nounOf(first)}: keep it easy${better ? ` or pick ${dayName(weekday(better.date))}` : ''}.`
}

/** Moves a workout to a free day of its week; the rest day takes its old place. */
export function moveWorkout(source: Plan, workoutId: string, toDate: string): Plan {
  const plan = clone(source)
  const week = plan.weeks.find((w) => w.days.some((d) => d.id === workoutId))
  if (!week) throw new Error(`no workout ${workoutId}`)
  const w = week.days.find((d) => d.id === workoutId)!
  const free = week.days.find((d) => d.date === toDate)
  if (!free || free.kind !== 'rest') throw new Error(`${toDate} is not a free day`)
  const from = w.date
  w.date = toDate
  free.date = from
  week.days.sort((a, b) => (a.date < b.date ? -1 : 1))
  week.plannedKm = weekKm(week.days)
  return plan
}

export const dayAfter = (date: string) => addDays(date, 1)
