export type SessionKind = 'easy' | 'tempo' | 'intervals' | 'long' | 'race' | 'rest'
export type BlockKind = 'easy' | 'rep' | 'jog'
export type RaceDistance = '5K' | '10K' | 'Half'
export type Feel = 'Easy' | 'Fine' | 'Hard' | 'Very hard' | 'Max'
export type WorkoutStatus = 'planned' | 'done' | 'missed' | 'skipped'
/** 0 is Monday, 6 is Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** One bar of the workout shape: width is time, height is effort. */
export interface Block {
  kind: BlockKind
  label: string
  meters: number
  /** Seconds per km. */
  pace: number
  seconds: number
  /** 0 to 1. */
  effort: number
}

export interface Step {
  title: string
  detail: string
  /** Seconds per km. */
  pace: number
  /** Seconds per km, slow end last. Null when the note says what to do instead. */
  range: [number, number] | null
  note?: string
  hard: boolean
}

export interface Workout {
  id: string
  week: number
  date: string
  kind: SessionKind
  title: string
  km: number
  blocks: Block[]
  steps: Step[]
  why: string
  summary: string
  status: WorkoutStatus
  movedFrom?: { week: number; date: string }
  movedTo?: { week: number; date: string; id: string }
  sentToWatch?: boolean
  runId?: string
}

export type WeekNote = 'Recovery week' | 'Peak week' | 'Taper' | 'Race week'

export interface Week {
  n: number
  /** Monday. */
  start: string
  plannedKm: number
  note?: WeekNote
  days: Workout[]
}

export interface Race {
  id: string
  name: string
  city: string
  date: string
  distance: RaceDistance
  km: number
}

export interface Adjustment {
  id: string
  missedId: string
  missedTitle: string
  missedDate: string
  week: number
  toId?: string
  replacedTitle?: string
  message: string
}

export interface Plan {
  id: string
  race: Race
  /** Goal finish, seconds. */
  goal: number
  /** Goal pace, seconds per km. */
  goalPace: number
  runDays: Weekday[]
  longDay: Weekday
  weeks: Week[]
  adjustments: Adjustment[]
}

export interface Run {
  id: string
  workoutId?: string
  date: string
  /** Wall-clock time the watch synced it, HH:MM. */
  syncedAt: string
  kind: SessionKind
  title: string
  km: number
  seconds: number
  /** Seconds per km. */
  pace: number
  /** Seconds per km for each full km, then the part km. */
  splits: number[]
  /** Average rep pace, seconds per km, for interval sessions. */
  repPace?: number
  feel?: Feel
  /** The watch's race predictor after this run, seconds. */
  predicted: number
}

export interface WatchConnection {
  connected: boolean
  name: string
  /** ISO date and time of the last good sync, wall clock. */
  lastSync: { date: string; time: string }
  failing: boolean
}

export interface Runner {
  name: string
  fullName: string
  initials: string
  city: string
}

export interface Now {
  date: string
  time: string
}
