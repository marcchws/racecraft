import { describe, expect, it } from 'vitest'
import { band, linear, niceDomain, stepIndex, ticks } from '../charts/scale'
import { applyMiss, backToBack, freeDays, moveWorkout } from './adjust'
import { fmtDuration, fmtPace, halfPaceFromWeeklyKm, pacesFromGoal, parseDuration, riegel } from './pace'
import { buildPlan, findWorkout, TEMPLATE } from './plan'
import { splitsOf } from './runs'
import { DEMO_NOW, luisaPlan, luisaRuns, RACES, todaysRun, TREND } from './seed'
import { durationOf } from './workouts'

const plan = luisaPlan(DEMO_NOW)

describe('pace maths', () => {
  it('derives every target from the goal pace', () => {
    expect(plan.goalPace).toBe(318)
    const p = pacesFromGoal(plan.goalPace)
    expect([p.rep, p.tempo, p.easy, p.jog].map(fmtPace)).toEqual(['5:05', '5:20', '6:30', '7:00'])
  })
  it('formats and parses durations', () => {
    expect(fmtDuration(3612)).toBe('1:00:12')
    expect(fmtDuration(244)).toBe('4:04')
    expect(parseDuration('1:52:00')).toBe(6720)
    expect(parseDuration('48:30')).toBe(2910)
    expect(parseDuration('1:75:00')).toBeNull()
    expect(parseDuration('fast')).toBeNull()
  })
  it('carries a race time to another distance with Riegel', () => {
    expect(Math.round(riegel(50 * 60, 10, 21.0975))).toBe(6619)
    expect(halfPaceFromWeeklyKm(10)).toBe(380)
    expect(halfPaceFromWeeklyKm(200)).toBe(285)
  })
})

describe('plan generator', () => {
  it('builds twelve weeks with the planned km of the spec', () => {
    expect(plan.weeks.map((w) => w.plannedKm)).toEqual([22, 25, 28, 23, 30, 34, 40, 32, 42, 44, 30, 28])
    expect(plan.weeks.every((w) => w.days.length === 7)).toBe(true)
    expect(TEMPLATE).toHaveLength(12)
  })
  it('puts the race on its Sunday and week 7 on 2 Nov', () => {
    expect(plan.weeks[11]!.days[6]).toMatchObject({ kind: 'race', date: '2026-12-13', km: 21.1 })
    expect(plan.weeks[6]!.start).toBe('2026-11-02')
  })
  it("shapes today's reps as the prototype drew them", () => {
    const today = findWorkout(plan, 'w7-tue')!
    expect(today).toMatchObject({ title: '6 × 800 m', km: 10.2, kind: 'intervals' })
    expect(today.blocks).toHaveLength(13)
    expect(Math.round(durationOf(today) / 60)).toBe(61)
    expect(today.why).toContain('Six is one more than last week.')
  })
  it('scales to another runner and race', () => {
    const p = buildPlan({ id: 't', race: RACES[1]!, start: '2026-11-02', goal: 50 * 60, runDays: [0, 2, 4], longDay: 4, startKm: 15, firstDay: '2026-11-03' })
    expect(p.weeks).toHaveLength(7)
    expect(p.weeks[0]!.days[0]!.kind).toBe('rest')
    expect(p.weeks.at(-1)!.days[6]!.kind).toBe('race')
    expect(Math.max(...p.weeks.flatMap((w) => w.days.filter((d) => d.kind === 'long').map((d) => d.km)))).toBeLessThanOrEqual(14)
  })
})

describe('the adjustment rule', () => {
  it("moves week 6's missed tempo into this Thursday's easy run", () => {
    const thu = findWorkout(plan, 'w6-thu-moved')!
    expect(thu).toMatchObject({ date: '2026-11-05', title: 'Tempo 5 km', km: 8, movedFrom: { week: 6 } })
    expect(findWorkout(plan, 'w6-thu')).toMatchObject({ status: 'missed', movedTo: { week: 7, date: '2026-11-05' } })
    expect(plan.adjustments[0]!.message).toBe("You missed last Thursday's tempo. Sunday's long run stays; the tempo replaces this Thursday's easy run.")
    expect(plan.weeks[6]!.plannedKm).toBe(40)
  })
  it('never replaces the long run and moves skipped reps to the first calm easy day', () => {
    const { plan: next, adjustment } = applyMiss(plan, 'w7-tue', 'skipped', DEMO_NOW)
    const w8 = next.weeks[7]!
    expect(w8.days.find((d) => d.kind === 'long')).toBeDefined()
    expect(adjustment?.toId && findWorkout(next, adjustment.toId)?.date).toBe('2026-11-12')
    expect(adjustment?.message).toBe("You skipped today's reps. Sunday's long run stays; the reps replace next Thursday's easy run.")
  })
  it('does not make up a missed easy run', () => {
    expect(applyMiss(plan, 'w7-sat', 'skipped', DEMO_NOW).adjustment).toBeNull()
  })
  it('warns before two hard days in a row and still allows the move', () => {
    const week = plan.weeks[6]!
    const tempo = findWorkout(plan, 'w6-thu-moved')!
    expect(freeDays(week, DEMO_NOW).map((d) => d.date)).toEqual(['2026-11-04', '2026-11-06'])
    expect(backToBack(week, tempo, '2026-11-04', DEMO_NOW)).toBe('Tempo the day after reps: keep it easy or pick Friday.')
    expect(backToBack(week, tempo, '2026-11-06', DEMO_NOW)).toBeNull()
    const moved = moveWorkout(plan, tempo.id, '2026-11-04')
    expect(findWorkout(moved, tempo.id)!.date).toBe('2026-11-04')
    expect(moved.weeks[6]!.days.map((d) => d.kind)).toEqual(['rest', 'intervals', 'tempo', 'rest', 'rest', 'easy', 'long'])
  })
})

describe('synced runs', () => {
  const runs = luisaRuns(plan).filter((r) => r.workoutId)
  it('adds up to the done km of each week', () => {
    TREND.doneKm.forEach((km, i) => {
      const sum = runs.filter((r) => r.workoutId!.startsWith(`w${i + 1}-`)).reduce((t, r) => t + r.km, 0)
      expect(Math.round(sum * 10) / 10).toBe(km)
    })
    expect(runs).toHaveLength(23)
  })
  it('keeps each week on its easy pace, 6:52 down to 6:31', () => {
    TREND.easyPace.forEach((pace, i) => {
      const easy = runs.filter((r) => r.workoutId!.startsWith(`w${i + 1}-`) && (r.kind === 'easy' || r.kind === 'long'))
      expect(Math.round(easy.reduce((t, r) => t + r.pace, 0) / easy.length)).toBe(pace)
    })
  })
  it("syncs today's reps as 10.3 km in 1:00:12", () => {
    const run = todaysRun(plan)
    expect(fmtDuration(run.seconds)).toBe('1:00:12')
    expect(run.splits).toHaveLength(11)
  })
  it('splits a profile per km', () => {
    expect(splitsOf([{ meters: 2500, pace: 300 }])).toEqual([300, 300, 300])
    expect(splitsOf([{ meters: 500, pace: 300 }, { meters: 500, pace: 400 }])).toEqual([350])
  })
})

describe('chart scales', () => {
  it('maps and inverts, faster pace upwards', () => {
    const y = linear([380, 420], [0, 100])
    expect(y(400)).toBe(50)
    expect(y.invert(25)).toBe(390)
  })
  it('finds the slot under a pointer', () => {
    const b = band(12, [0, 120])
    expect(b.center(0)).toBe(5)
    expect(b.at(119)).toBe(11)
    expect(b.at(-5)).toBe(0)
  })
  it('rounds domains and ticks', () => {
    expect(niceDomain([22, 44], 10)).toEqual([20, 50])
    expect(ticks([0, 40], 20)).toEqual([0, 20, 40])
  })
  it('steps with arrow keys from nothing selected', () => {
    expect(stepIndex(null, 1, 5)).toBe(0)
    expect(stepIndex(null, -1, 5)).toBe(4)
    expect(stepIndex(4, 1, 5)).toBe(4)
  })
})
