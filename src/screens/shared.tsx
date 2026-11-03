import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useConnectWatch, useMe, useSync } from '@/api/queries'
import type { WeekSummary } from '@/api/types'
import { WeekBars, type BarItem } from '@/charts/WeekBars'
import { dateOfMonth, dayShort, fmtDay, weekday } from '@/domain/dates'
import { fmtDuration, fmtPace } from '@/domain/pace'
import type { Adjustment, Race, Run, WatchConnection, Workout } from '@/domain/types'
import { isHard } from '@/domain/workouts'
import { Bend, type SceneName } from '@/ui/Bend'
import { Icon } from '@/ui/Icon'
import { useToast } from '@/ui/toast'

export function WeekStrip({ days, today, className = '' }: { days: Workout[]; today: string; className?: string }) {
  return (
    <ol className={`grid grid-cols-7 gap-1 ${className}`} aria-label="This week">
      {days.map((d) => {
        const isToday = d.date === today, done = d.status === 'done', missed = d.status === 'missed' || d.status === 'skipped'
        const state = done ? ', done' : missed ? `, ${d.status}` : ''
        return (
          <li key={d.id} aria-label={`${fmtDay(d.date)}: ${d.title}${state}${isToday ? ', today' : ''}`}
            className={`grid justify-items-center gap-1 rounded-[10px] pt-2 pb-[7px] text-[12px] ${isToday ? 'bg-ink text-hero-muted' : 'text-muted'}`}>
            <span aria-hidden>{dayShort(weekday(d.date))[0]}</span>
            <b className={`text-[16px] font-semibold ${isToday ? 'text-white' : 'text-ink'}`} aria-hidden>{dateOfMonth(d.date)}</b>
            {done ? <Icon name="check" size={16} className={`-mt-1 -mb-[5px] ${isToday ? 'text-good-on-ink' : 'text-good'}`} />
              : missed ? <Icon name="close" size={14} className="-my-1 text-muted" />
              : d.kind === 'rest' ? <i className="mt-0.5 h-0.5 w-2.5 rounded-[1px] bg-line-strong" aria-hidden />
              : <i className={`size-1.5 rounded-full ${isHard(d) ? 'bg-red' : isToday ? 'bg-white' : 'bg-ink'}`} aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

export function AdjustNote({ adjustment }: { adjustment: Adjustment }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-[12px] bg-red-soft px-3.5 py-3 text-[14px] text-red-deep" role="note">
      <Icon name="adjust" />
      <div><b className="mb-px block font-semibold">Plan adjusted</b>{adjustment.message}</div>
    </div>
  )
}

export function WatchNote({ watch }: { watch: WatchConnection }) {
  const sync = useSync()
  const toast = useToast()
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-[12px] border border-line-strong bg-card px-3.5 py-3 text-[14px]" role="status">
      <Icon name="cloudOff" />
      <div><b className="mb-px block font-semibold">Your watch isn't syncing</b><span className="muted">Last sync {fmtDay(watch.lastSync.date).slice(0, 3)} {watch.lastSync.time}. Today's run comes in once it's back.</span></div>
      <button className="btn btn-sm min-w-[92px]" aria-busy={sync.isPending || undefined} onClick={() => sync.mutate(undefined, {
        onError: () => toast({ message: "Still no answer from your watch. We'll keep trying." }),
        onSuccess: () => toast({ message: 'Your watch is back. Nothing new to sync.' }),
      })}>
        {sync.isPending ? <><span className="spin" aria-hidden /><span className="sr-only">Trying again</span></> : 'Try again'}
      </button>
    </div>
  )
}

export const barItems = (weeks: WeekSummary[], live = true): BarItem[] => weeks.map((w) => ({
  key: String(w.n), label: String(w.n), planned: w.plannedKm, done: w.past || w.current ? w.doneKm : null, current: live && w.current, future: !w.past && !w.current,
  mark: w.note === 'Recovery week' ? 'Recovery' : w.note === 'Peak week' ? 'Peak' : w.note === 'Taper' ? 'Taper' : undefined,
}))

export const weekReadout = (weeks: WeekSummary[]) => (_: BarItem, i: number) => {
  const w = weeks[i]!
  const tail = w.missed[0] ?? w.note
  if (w.current) return <><b className="font-semibold text-ink">Week {w.n}, this week</b> · {w.doneKm} of {w.plannedKm} km so far{w.note ? ` · ${w.note}` : ''}</>
  if (w.past) return <><b className="font-semibold text-ink">Week {w.n}</b> · {w.doneKm} of {w.plannedKm} km{tail ? ` · ${tail}` : ''}</>
  return <><b className="font-semibold text-ink">Week {w.n}</b> · {w.plannedKm} km planned{w.note ? ` · ${w.note}` : ''}</>
}

export function RaceCard({ race, daysLeft, weeks, currentWeek, weeksTotal, predicted, goal, goalPace }: {
  race: Race; daysLeft: number; weeks: WeekSummary[]; currentWeek: number; weeksTotal: number; predicted: number; goal: number; goalPace: number
}) {
  const cw = weeks[currentWeek - 1]!
  return (
    <section className="card" aria-labelledby="race-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="tag" id="race-title"><Icon name="race" size={16} />{race.name}</span>
          <p className="muted text-[14px]">{fmtDay(race.date)} · {race.km} km</p>
        </div>
        <div className="disp text-[60px]">{daysLeft}<small className="ml-1 font-ui text-[15px] font-medium normal-case text-muted">days</small></div>
      </div>
      <WeekBars items={barItems(weeks)} initial={currentWeek - 1} label="Kilometres per plan week, planned and done." readout={weekReadout(weeks)} />
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Stat v={`Week ${currentWeek}`} l={`of ${weeksTotal} · ${cw.doneKm} of ${cw.plannedKm} km`} />
        <Stat v={fmtDuration(predicted)} l="Predicted" />
        <Stat v={fmtDuration(goal)} l={`Goal · ${fmtPace(goalPace)}/km`} />
      </div>
    </section>
  )
}
export const Stat = ({ v, l, big = false }: { v: ReactNode; l: ReactNode; big?: boolean }) => (
  <div><b className={`block font-semibold ${big ? 'text-[22px] leading-[1.1]' : 'text-[18px]'}`}>{v}</b><span className="text-[12px] text-muted">{l}</span></div>
)

export function SceneCard({ scene, title, children, actions, width = 240, headingLevel = 2 }: { scene: SceneName; title: string; children: ReactNode; actions?: ReactNode; width?: number; headingLevel?: 1 | 2 }) {
  const H = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <section className="card grid justify-items-center gap-2 px-5 pt-7 pb-6 text-center">
      <Bend name={scene} width={width} />
      <H className="disp mt-1 text-[36px]">{title}</H>
      <div className="max-w-[320px] text-muted">{children}</div>
      {actions && <div className="mt-2.5 grid w-full max-w-[320px] gap-2">{actions}</div>}
    </section>
  )
}

export function NoPlan() {
  const watch = useMe().data?.watch
  const connect = useConnectWatch()
  const toast = useToast()
  return (
    <SceneCard scene="start" title="No plan yet" actions={<>
      <Link to="/start" className="btn btn-primary">Build my plan</Link>
      {watch?.connected
        ? <p className="flex h-12 items-center justify-center gap-2 font-semibold"><Icon name="check" className="text-good" />Watch connected</p>
        : <button className="btn" aria-busy={connect.isPending || undefined} onClick={() => connect.mutate(undefined, {
            onSuccess: () => toast({ message: 'Watch connected. Your runs sync from now on.' }),
            onError: () => toast({ message: "Couldn't reach your watch. Try again in a minute." }),
          })}>
            {connect.isPending ? <><span className="spin" aria-hidden />Connecting…</> : <><Icon name="watch" />Connect a watch</>}
          </button>}
    </>}>
      Tell us your race, its date and how you run today. Your plan is ready in two minutes.
    </SceneCard>
  )
}

export const LoadError = ({ what = 'your plan', onRetry }: { what?: string; onRetry: () => void }) => (
  <SceneCard scene="broken" title={`Couldn't load ${what}`} actions={<button className="btn btn-primary" onClick={onRetry}>Try again</button>}>
    Nothing is lost: your plan and runs are saved. Check your connection and try again.
  </SceneCard>
)

export const Sk = ({ h, w = '100%', className = '' }: { h: number; w?: number | string; className?: string }) => (
  <span className={`sk block ${className}`} style={{ height: h, width: w }} aria-hidden />
)
export const Loading = ({ children }: { children: ReactNode }) => (
  <div className="contents" role="status" aria-live="polite" aria-busy="true"><span className="sr-only">Loading</span>{children}</div>
)

/** One synced run as a row: what it was, distance, time, pace and how it felt. */
export function RunRow({ run, to }: { run: Run; to?: string }) {
  const inner = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-soft"><Icon name={run.kind === 'rest' ? 'easy' : run.kind} size={18} /></span>
      <div className="min-w-0">
        <b className="block truncate font-semibold">{run.title}</b>
        <span className="text-[13px] text-muted">{fmtDay(run.date)} · {run.km.toFixed(1)} km · {fmtDuration(run.seconds)} · {fmtPace(run.pace)}/km</span>
      </div>
      <span className={run.feel ? 'chip chip-plain' : 'chip text-muted'}>{run.feel ?? 'No feel yet'}</span>
    </>
  )
  const cls = 'grid grid-cols-[32px_1fr_auto] items-center gap-2.5 py-2.5'
  return to ? <Link to={to} className={`${cls} -mx-2 rounded-[8px] px-2 hover:bg-chalk`}>{inner}</Link> : <div className={cls}>{inner}</div>
}
