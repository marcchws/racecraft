import { Link, useSearchParams } from 'react-router'
import { isNoPlan } from '@/api/client'
import { usePlan, useWeek } from '@/api/queries'
import type { PlanResponse, WeekView } from '@/api/types'
import { PageHead, useIsDesk } from '@/app/Shell'
import { WeekBars } from '@/charts/WeekBars'
import { addDays, dateOfMonth, dayShort, fmtDate, fmtDay } from '@/domain/dates'
import { fmtDuration, fmtPace } from '@/domain/pace'
import type { Now, Workout } from '@/domain/types'
import { isHard } from '@/domain/workouts'
import { Icon } from '@/ui/Icon'
import { DayLine } from '../today/ThisWeek'
import { MoreMenu } from '../workout/parts'
import { barItems, LoadError, Loading, NoPlan, Sk, Stat, weekReadout } from '../shared'

export function PlanScreen() {
  const q = usePlan()
  const desk = useIsDesk()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'calendar' ? 'calendar' : 'week'

  if (q.isPending) {
    return <><PageHead title="Plan" /><Loading><Sk h={desk ? 330 : 300} /><Sk h={44} w={desk ? 260 : '100%'} /><Sk h={420} /></Loading></>
  }
  if (q.isError) return <><PageHead title="Plan" />{isNoPlan(q.error) ? <Narrow><NoPlan /></Narrow> : <Narrow><LoadError onRetry={() => q.refetch()} /></Narrow>}</>

  const d = q.data
  const setView = (v: 'week' | 'calendar') => setParams((p) => { p.set('view', v); return p }, { replace: true })
  return (
    <>
      <PageHead kicker={`${d.race.name} · ${fmtDay(d.race.date)}`} title="Your plan" />
      <PlanHead d={d} />
      <div className={`flex flex-wrap items-center justify-between gap-3 ${desk ? 'mt-6 mb-3' : 'mt-1'}`}>
        <div className="seg" role="group" aria-label="View">
          <button aria-pressed={view === 'week'} onClick={() => setView('week')}><Icon name="plan" size={16} className="mr-1.5" />Week</button>
          <button aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}><Icon name="grid" size={16} className="mr-1.5" />Calendar</button>
        </div>
        {desk && <Legend />}
      </div>
      {view === 'week' ? <WeekPanel d={d} /> : <Calendar d={d} />}
    </>
  )
}

const Narrow = ({ children }: { children: React.ReactNode }) => {
  const desk = useIsDesk()
  return desk ? <div className="max-w-[560px]">{children}</div> : <>{children}</>
}

/** From the "Countdown" layout: the race as the plan's head, with every week's km and what each block is for. */
function PlanHead({ d }: { d: PlanResponse }) {
  const desk = useIsDesk()
  const diff = d.predicted - d.goal
  return (
    <section className="card" aria-labelledby="plan-race">
      <div className={`flex justify-between gap-4 ${desk ? 'items-end' : 'items-start'}`}>
        <div>
          <span className="tag" id="plan-race"><Icon name="race" size={16} />Race day · {fmtDay(d.race.date)}</span>
          <p className="muted mt-0.5 text-[14px]">{d.race.km} km · week {d.currentWeek} of {d.weeksTotal}</p>
        </div>
        <div className={`disp ${desk ? 'text-[96px]' : 'text-[72px]'}`}>{d.daysLeft}<small className="ml-1 font-ui text-[15px] font-medium normal-case text-muted">days to go</small></div>
      </div>
      <WeekBars items={barItems(d.weeks)} initial={d.currentWeek - 1} marks height={desk ? 190 : 150} label="Kilometres per plan week, planned and done, with recovery, peak and taper weeks marked." readout={weekReadout(d.weeks)} />
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Stat big v={fmtDuration(d.predicted)} l="Predicted finish" />
        <Stat big v={fmtDuration(d.goal)} l={`Goal · ${fmtPace(d.goalPace)}/km`} />
        <Stat big v={`${diff > 0 ? '+' : '−'}${fmtDuration(Math.abs(diff))}`} l={diff > 0 ? 'to find by race day' : 'ahead of goal'} />
      </div>
    </section>
  )
}

const Legend = () => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted" aria-label="Legend">
    <li className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-red-soft ring-1 ring-red/40" />Hard session</li>
    <li className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="text-good" />Done</li>
    <li className="inline-flex items-center gap-1.5"><Icon name="missed" size={14} />Missed</li>
    <li className="inline-flex items-center gap-1.5"><Icon name="adjust" size={14} />Moved</li>
  </ul>
)

/** From the "Week" layout: one row per day, ‹ › to change week; a row opens its workout. */
function WeekPanel({ d }: { d: PlanResponse }) {
  const [params, setParams] = useSearchParams()
  const n = Math.min(d.weeksTotal, Math.max(1, Number(params.get('week')) || d.currentWeek))
  const q = useWeek(n)
  const go = (k: number) => setParams((p) => { p.set('week', String(k)); return p }, { replace: true })
  const summary = d.weeks[n - 1]!
  const kind = summary.current ? 'This week' : summary.past ? 'Past week' : n === d.weeksTotal ? 'Race week' : 'Coming up'
  return (
    <section className="card" aria-labelledby="week-title">
      <div className="flex items-center justify-between gap-2">
        <button className="icon-btn" onClick={() => go(n - 1)} disabled={n <= 1} aria-label="Previous week" style={n <= 1 ? { opacity: 0.35 } : undefined}><Icon name="back" /></button>
        <div className="text-center" aria-live="polite">
          <h2 id="week-title" className="disp text-[28px]">Week {n}</h2>
          <p className="text-[13px] text-muted">{kind} · {fmtDate(summary.start)}–{fmtDate(addDays(summary.start, 6))}{summary.note && summary.note !== 'Race week' ? ` · ${summary.note}` : ''}</p>
        </div>
        <button className="icon-btn" onClick={() => go(n + 1)} disabled={n >= d.weeksTotal} aria-label="Next week" style={n >= d.weeksTotal ? { opacity: 0.35 } : undefined}><Icon name="chevron" /></button>
      </div>
      <p className="mt-3 mb-1 flex flex-wrap justify-between gap-x-4 border-t border-line pt-3 text-[14px]">
        <span><b className="font-semibold">{summary.plannedKm} km</b> <span className="muted">planned</span></span>
        {(summary.past || summary.current) && <span><b className="font-semibold">{summary.doneKm} km</b> <span className="muted">done{summary.missed.length ? ` · ${summary.missed.join(', ')}` : ''}</span></span>}
      </p>
      {q.isPending ? <Loading><div className="grid gap-2 pt-2">{Array.from({ length: 7 }, (_, i) => <Sk key={i} h={44} />)}</div></Loading>
        : q.isError ? <div className="py-6 text-center"><p className="muted">Couldn't load week {n}.</p><button className="btn btn-sm mt-3" onClick={() => q.refetch()}>Try again</button></div>
        : <WeekRows week={q.data} now={d.now} />}
    </section>
  )
}

function WeekRows({ week, now }: { week: WeekView; now: Now }) {
  return (
    <ul>
      {week.days.map((day) => {
        return (
          <li key={day.id} className="grid grid-cols-[1fr_auto] items-center border-t border-line first:border-t-0">
            <div className="min-w-0 pl-2"><DayLine day={day} today={now.date} run={week.runs[day.id]} /></div>
            <span className="flex w-9 justify-end pl-1">{day.kind !== 'rest' && <MoreMenu workout={day} week={week} now={now} />}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** All weeks as rows of seven days, each cell its glyph and km; at 390 the list snaps a week at a time. */
function Calendar({ d }: { d: PlanResponse }) {
  const desk = useIsDesk()
  const today = d.now.date
  return (
    <section className="card p-0" aria-label="Calendar, all weeks">
      <div className="grid grid-cols-[34px_repeat(7,minmax(0,1fr))] gap-1 border-b border-line px-2 py-2 text-center text-[12px] font-semibold text-muted desk:grid-cols-[64px_repeat(7,minmax(0,1fr))] desk:px-4" aria-hidden>
        <span />{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i}>{desk ? dayShort(i as 0) : dayShort(i as 0)[0]}</span>)}
      </div>
      <ol className={desk ? 'px-4 pb-3' : 'max-h-[min(70dvh,560px)] snap-y snap-mandatory overflow-y-auto px-2 pb-2'} aria-label="Weeks">
        {d.plan.weeks.map((w) => {
          const s = d.weeks[w.n - 1]!
          return (
            <li key={w.n} className="snap-start border-b border-line py-1.5 last:border-b-0">
              <div className="grid grid-cols-[34px_repeat(7,minmax(0,1fr))] items-stretch gap-1 desk:grid-cols-[64px_repeat(7,minmax(0,1fr))]">
                <div className={`grid content-center text-[12px] leading-tight ${s.current ? 'font-bold text-red-deep' : 'text-muted'}`}>
                  <span className="font-semibold">{desk ? `Week ${w.n}` : `W${w.n}`}</span>
                  {desk && <span>{w.plannedKm} km</span>}
                </div>
                {w.days.map((day) => <Cell key={day.id} day={day} today={today} current={s.current} />)}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Cell({ day, today, current }: { day: Workout; today: string; current: boolean }) {
  const desk = useIsDesk()
  const rest = day.kind === 'rest'
  const missed = day.status === 'missed' || day.status === 'skipped'
  const isToday = day.date === today
  const label = `${fmtDay(day.date)}: ${day.title}${rest ? '' : `, ${day.km.toFixed(1)} km`}${day.status === 'done' ? ', done' : missed ? `, ${day.status}` : ''}${day.movedFrom ? `, moved from week ${day.movedFrom.week}` : ''}${isToday ? ', today' : ''}`
  const tone = isToday ? 'bg-ink text-white' : isHard(day) ? 'bg-red-soft' : rest ? '' : 'bg-soft'
  // The name is the full sentence in a hidden span, not an aria-label, so the cell's visible digits never disagree with it.
  const inner = (
    <>
      <span className="sr-only">{label}</span>
      <span aria-hidden className={`flex w-full items-center justify-between text-[11px] ${isToday ? 'text-hero-muted' : 'text-muted'}`}>
        <span>{dateOfMonth(day.date)}</span>
        {day.status === 'done' ? <Icon name="check" size={13} className={isToday ? 'text-good-on-ink' : 'text-good'} />
          : missed ? <Icon name="missed" size={13} />
          : day.movedFrom ? <Icon name="adjust" size={13} /> : null}
      </span>
      {rest ? <span className="text-line-strong" aria-hidden>–</span> : <Icon name={day.kind} size={desk ? 18 : 16} />}
      {!rest && <span aria-hidden className={`text-[12px] font-semibold ${missed ? 'line-through' : ''}`}>{day.kind === 'race' ? 'Race' : day.km.toFixed(desk ? 1 : 0)}{desk && day.kind !== 'race' ? ' km' : ''}</span>}
    </>
  )
  const cls = `grid min-h-[64px] justify-items-center gap-0.5 rounded-[8px] px-1 py-1.5 ${tone} ${current && !isToday ? 'ring-1 ring-red/50' : ''}`
  return rest
    ? <div className={cls}>{inner}</div>
    : <Link to={`/workout/${day.id}`} className={`${cls} hover:ring-1 hover:ring-ink`}>{inner}</Link>
}
