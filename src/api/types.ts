import type { Adjustment, Feel, Now, Plan, Race, RaceDistance, Run, Runner, WatchConnection, Week, WeekNote, Weekday, Workout } from '@/domain/types'

export interface WeekSummary {
  n: number
  start: string
  plannedKm: number
  doneKm: number
  note?: WeekNote
  current: boolean
  past: boolean
  /** "Missed Thu tempo" */
  missed: string[]
}

export interface WeekView extends Week {
  doneKm: number
  current: boolean
  runs: Record<string, Run>
}

export interface RaceHead {
  race: Race
  daysLeft: number
  goal: number
  goalPace: number
  predicted: number
  currentWeek: number
  weeksTotal: number
}

export interface TodayResponse extends RaceHead {
  now: Now
  runner: Runner
  week: WeekView
  weeks: WeekSummary[]
  today: Workout
  next: Workout | null
  run: Run | null
  adjustment: Adjustment | null
  watch: WatchConnection
}

export interface PlanResponse extends RaceHead {
  now: Now
  weeks: WeekSummary[]
  plan: Plan
}

export interface WorkoutResponse {
  now: Now
  workout: Workout
  run: Run | null
  week: Week
  watch: WatchConnection
}

export type Range = 'plan' | '4w' | '3m'
export interface ProgressWeek {
  key: string
  /** Axis label: "1" for a plan week, "10 Aug" before it. */
  label: string
  /** "Week 6" or "Week of 10 Aug". */
  title: string
  plannedKm: number | null
  doneKm: number
  easyPace: number | null
  predicted: number | null
  note?: string
  current: boolean
}
export interface ProgressResponse {
  now: Now
  range: Range
  weeks: ProgressWeek[]
  consistency: { done: number; planned: number; missed: string[] }
  runs: Run[]
  goal: number | null
  hasPlan: boolean
}

export interface MeResponse {
  now: Now
  runner: Runner
  watch: WatchConnection
  plan: { runDays: Weekday[]; longDay: Weekday; currentWeek: number; weeksTotal: number } | null
}

export type Level = { kind: 'race'; distance: RaceDistance; time: number } | { kind: 'km'; km: number }
export interface NewPlanRequest {
  race: { id: string } | { name: string; distance: RaceDistance; date: string }
  level: Level
  runDays: Weekday[]
  longDay: Weekday
}

export interface ApiError {
  error: string
  message: string
}

export type { Feel }
