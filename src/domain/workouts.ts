import { fmtPace, pacesFromGoal } from './pace'
import { round1 } from './rng'
import type { Block, SessionKind, Step, Workout } from './types'

// Effort sets each block's height in the workout shape. It is a drawing scale, not a physiological one.
const EFFORT = { easy: 0.42, long: 0.48, jog: 0.2, rep: 1, tempo: 0.8, race: 0.9 } as const
const JOG_M = 400

type Paces = ReturnType<typeof pacesFromGoal>
type Base = Pick<Workout, 'id' | 'week' | 'date'>

const block = (kind: Block['kind'], label: string, meters: number, pace: number, effort: number): Block =>
  ({ kind, label, meters, pace, seconds: (meters / 1000) * pace, effort })

const totalKm = (blocks: Block[]) => round1(blocks.reduce((t, b) => t + b.meters, 0) / 1000)
const km1 = (m: number) => (m / 1000).toFixed(1)
const easyRange = (p: Paces): [number, number] => [p.easy - 10, p.easy + 10]

const make = (base: Base, kind: SessionKind, title: string, blocks: Block[], steps: Step[], summary: string, why: string): Workout =>
  ({ ...base, kind, title, km: totalKm(blocks), blocks, steps, summary, why, status: 'planned' })

export function intervals(base: Base, n: number, repM: number, p: Paces, why: string, warmM = 2000, coolM = 1400): Workout {
  const blocks = [block('easy', 'Warm-up', warmM, p.easy, EFFORT.easy)]
  for (let r = 1; r <= n; r++) {
    blocks.push(block('rep', `Rep ${r} of ${n}`, repM, p.rep, EFFORT.rep))
    if (r < n) blocks.push(block('jog', `Jog ${r} of ${n - 1}`, JOG_M, p.jog, EFFORT.jog))
  }
  blocks.push(block('easy', 'Cool-down', coolM, p.easy, EFFORT.easy))
  const title = `${n} × ${repM} m`
  return make(base, 'intervals', title, blocks, [
    { title: 'Warm-up', detail: `${km1(warmM)} km easy`, pace: p.easy, range: easyRange(p), hard: false },
    { title, detail: `${JOG_M} m jog between reps`, pace: p.rep, range: [p.rep - 5, p.rep + 5], hard: true },
    { title: 'Cool-down', detail: `${km1(coolM)} km easy`, pace: p.easy, range: null, note: 'walk if needed', hard: false },
  ], `Warm-up ${km1(warmM)} km · ${title} with ${JOG_M} m jogs · cool-down ${km1(coolM)} km`, why)
}

export function tempo(base: Base, tempoKm: number, p: Paces, why: string, opts: { pace?: number; title?: string; warmM?: number; coolM?: number } = {}): Workout {
  const pace = opts.pace ?? p.tempo, warmM = opts.warmM ?? 1500, coolM = opts.coolM ?? 1500
  const title = opts.title ?? `Tempo ${tempoKm} km`
  const blocks = [
    block('easy', 'Warm-up', warmM, p.easy, EFFORT.easy),
    block('rep', opts.title ? `${tempoKm} km at goal pace` : `Tempo ${tempoKm} km`, tempoKm * 1000, pace, EFFORT.tempo),
    block('easy', 'Cool-down', coolM, p.easy, EFFORT.easy),
  ]
  return make(base, 'tempo', title, blocks, [
    { title: 'Warm-up', detail: `${km1(warmM)} km easy`, pace: p.easy, range: easyRange(p), hard: false },
    { title: `${tempoKm} km steady`, detail: opts.title ? 'goal pace, even splits' : 'comfortably hard, even splits', pace, range: [pace - 5, pace + 5], hard: true },
    { title: 'Cool-down', detail: `${km1(coolM)} km easy`, pace: p.easy, range: null, note: 'walk if needed', hard: false },
  ], `Warm-up ${km1(warmM)} km · ${tempoKm} km at ${fmtPace(pace)} · cool-down ${km1(coolM)} km`, why)
}

export function easy(base: Base, km: number, p: Paces, why: string): Workout {
  const blocks = [block('easy', 'Easy run', km * 1000, p.easy, EFFORT.easy)]
  return make(base, 'easy', 'Easy run', blocks, [
    { title: 'Easy run', detail: `${km.toFixed(1)} km, you can talk the whole way`, pace: p.easy, range: [p.easy - 10, p.easy + 20], hard: false },
  ], `${km.toFixed(1)} km easy at ${fmtPace(p.easy)}`, why)
}

export function long(base: Base, km: number, p: Paces, why: string): Workout {
  const blocks = [block('easy', 'Long run', km * 1000, p.easy, EFFORT.long)]
  return make(base, 'long', 'Long run', blocks, [
    { title: 'Long run', detail: `${km.toFixed(1)} km steady, water every 5 km`, pace: p.easy, range: easyRange(p), hard: false },
  ], `${km.toFixed(1)} km steady at ${fmtPace(p.easy)}`, why)
}

export function race(base: Base, name: string, km: number, goalPace: number, why: string): Workout {
  const meters = Math.round(km * 1000)
  const blocks = [block('rep', name, meters, goalPace, EFFORT.race)]
  return make(base, 'race', 'Race day', blocks, [
    { title: 'First 5 km', detail: 'hold back, it feels slow', pace: goalPace + 2, range: [goalPace, goalPace + 5], hard: true },
    { title: 'To the finish', detail: `${name}`, pace: goalPace, range: [goalPace - 5, goalPace + 5], hard: true },
  ], `${name} · ${km1(meters)} km at ${fmtPace(goalPace)}`, why)
}

export function rest(base: Base): Workout {
  return make(base, 'rest', 'Rest', [], [], 'Rest day', 'Rest is when the work turns into fitness.')
}

export const HARD: SessionKind[] = ['intervals', 'tempo', 'race']
export const isHard = (w: Pick<Workout, 'kind'>) => HARD.includes(w.kind)
export const isRun = (w: Pick<Workout, 'kind'>) => w.kind !== 'rest'
export const durationOf = (w: Pick<Workout, 'blocks'>) => w.blocks.reduce((t, b) => t + b.seconds, 0)
/** How a session is named in a sentence: "the tempo", "the reps". */
export const nounOf = (w: Pick<Workout, 'kind' | 'title'>) =>
  w.kind === 'intervals' ? 'reps' : w.kind === 'tempo' ? 'tempo' : w.kind === 'long' ? 'long run' : w.kind === 'race' ? 'race' : 'easy run'
