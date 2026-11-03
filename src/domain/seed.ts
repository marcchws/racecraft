import { applyMiss } from './adjust'
import { buildPlan } from './plan'
import { seedBaseRuns, seedRuns, splitsOf, type Trend } from './runs'
import type { Now, Plan, Race, Run, Runner, WatchConnection } from './types'

// Everything here is invented: the runner, the races and the numbers.
export const RUNNER: Runner = { name: 'Luísa', fullName: 'Luísa Prado', initials: 'LP', city: 'São Paulo' }

export const RACES: Race[] = [
  { id: 'sp-riverside-half', name: 'São Paulo Riverside Half', city: 'São Paulo', date: '2026-12-13', distance: 'Half', km: 21.1 },
  { id: 'rio-seafront-10k', name: 'Rio Seafront 10K', city: 'Rio de Janeiro', date: '2026-12-20', distance: '10K', km: 10 },
  { id: 'curitiba-botanic-half', name: 'Curitiba Botanic Half', city: 'Curitiba', date: '2027-02-21', distance: 'Half', km: 21.1 },
  { id: 'bh-hills-10k', name: 'Belo Horizonte Hills 10K', city: 'Belo Horizonte', date: '2027-01-31', distance: '10K', km: 10 },
  { id: 'floripa-lagoon-5k', name: 'Floripa Lagoon 5K', city: 'Florianópolis', date: '2026-12-06', distance: '5K', km: 5 },
  { id: 'recife-bridges-half', name: 'Recife Bridges Half', city: 'Recife', date: '2026-11-29', distance: 'Half', km: 21.1 },
]

/** The demo clock: Tue 3 Nov 2026, 06:10 in São Paulo, so every load shows the same day. */
export const DEMO_NOW: Now = { date: '2026-11-03', time: '06:10' }
export const SEED = 2026

export const TREND: Trend = {
  doneKm: [22.0, 24.6, 28.4, 21.0, 30.2, 26.1],
  easyPace: [412, 405, 401, 398, 394, 391],
  repPace: [312, 311, 309, 308, 306, 305],
  // 2:01:10 after week 1 down to 1:55:40 after week 6.
  predicted: [7270, 7205, 7130, 7115, 7020, 6940],
  predictedBefore: 7330,
}

const BASE_WEEKS = [
  { km: 14.0, pace: 428, predicted: 7480 },
  { km: 15.2, pace: 426, predicted: 7465 },
  { km: 13.1, pace: 425, predicted: 7470 },
  { km: 16.4, pace: 422, predicted: 7430 },
  { km: 15.8, pace: 420, predicted: 7410 },
  { km: 17.2, pace: 418, predicted: 7380 },
  { km: 18.5, pace: 416, predicted: 7350 },
]

export function luisaPlan(now: Now): Plan {
  const plan = buildPlan({
    id: 'plan-luisa', race: RACES[0]!, start: '2026-09-21', goal: 1 * 3600 + 52 * 60,
    runDays: [1, 3, 5, 6], longDay: 6, startKm: 22,
  })
  return applyMiss(plan, 'w6-thu', 'missed', now).plan
}

/** Today's reps as her watch synced them at 07:24: 10.3 km in 1:00:12, reps averaging 5:03 against 5:05. */
export function todaysRun(plan: Plan): Run {
  const reps = [306, 304, 302, 303, 301, 304]
  const segments = [{ meters: 2000, pace: 388 }]
  reps.forEach((p, i) => {
    segments.push({ meters: 800, pace: p })
    if (i < 5) segments.push({ meters: 400, pace: 400 })
  })
  // The cool-down ran 100 m long; its pace closes the total at 3612 s.
  const before = segments.reduce((t, s) => t + (s.meters / 1000) * s.pace, 0)
  segments.push({ meters: 1500, pace: (3612 - before) / 1.5 })
  const w = plan.weeks[6]!.days[1]!
  return {
    id: `run-${w.id}`, workoutId: w.id, date: w.date, syncedAt: '07:24', kind: w.kind, title: w.title,
    km: 10.3, seconds: 3612, pace: Math.round(3612 / 10.3), splits: splitsOf(segments), repPace: 303, predicted: 6940,
  }
}

export function luisaRuns(plan: Plan): Run[] {
  return [...seedBaseRuns('2026-08-03', BASE_WEEKS, SEED + 1), ...seedRuns(plan, TREND, SEED, '2026-11-02')]
}

export const WATCH: WatchConnection = { connected: true, name: 'Your watch', lastSync: { date: '2026-11-02', time: '05:58' }, failing: false }
