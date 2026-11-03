import { useSearchParams } from 'react-router'
import { useProgress } from '@/api/queries'
import type { ProgressResponse, ProgressWeek, Range } from '@/api/types'
import { PageHead, useIsDesk } from '@/app/Shell'
import { LineChart } from '@/charts/LineChart'
import { WeekBars, type BarItem } from '@/charts/WeekBars'
import { fmtDuration, fmtPace } from '@/domain/pace'
import { Link } from 'react-router'
import { LoadError, Loading, RunRow, SceneCard, Sk } from '../shared'

const RANGES: { id: Range; label: string }[] = [{ id: 'plan', label: 'This plan' }, { id: '4w', label: '4 weeks' }, { id: '3m', label: '3 months' }]
/** "2:01" for an axis; the readout keeps the seconds. */
const hm = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`

export function ProgressScreen() {
  const [params, setParams] = useSearchParams()
  const range = (RANGES.find((r) => r.id === params.get('range'))?.id ?? 'plan') as Range
  const q = useProgress(range)
  const desk = useIsDesk()
  const setRange = (r: Range) => setParams((p) => { p.set('range', r); return p }, { replace: true })
  const control = (
    <div className="seg" role="group" aria-label="Range">
      {RANGES.map((r) => <button key={r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>)}
    </div>
  )
  const head = <PageHead kicker="Your running, synced from your watch" title="Progress" aside={desk ? control : undefined} />

  if (q.isPending) return <>{head}{!desk && control}<Loading><Sk h={200} /><Sk h={240} /><Sk h={240} /></Loading></>
  if (q.isError) return <>{head}<div className="desk:max-w-[560px]"><LoadError what="your progress" onRetry={() => q.refetch()} /></div></>
  const d = q.data
  if (!d.runs.length && d.weeks.every((w) => !w.doneKm)) {
    return (
      <>{head}<div className="desk:max-w-[560px]">
        <SceneCard scene="zero" title="No runs yet" actions={d.hasPlan ? <Link to="/" className="btn btn-primary">See today's run</Link> : <Link to="/start" className="btn btn-primary">Build my plan</Link>}>
          Your runs show up here once your watch syncs the first one. Distance, easy pace and your predicted time grow from there.
        </SceneCard>
      </div></>
    )
  }
  const charts = <Charts d={d} />
  const side = <><Consistency d={d} /><Recent d={d} /></>
  return desk
    ? <>{head}<div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5"><div className="grid gap-4">{charts}</div><div className="grid gap-4">{side}</div></div></>
    : <>{head}{control}{charts}{side}</>
}

const labelOf = (w: ProgressWeek, i: number, weeks: ProgressWeek[]) => {
  if (/^\d+$/.test(w.label)) return w.label
  const month = w.key.slice(5, 7)
  return i === 0 || weeks[i - 1]!.key.slice(5, 7) !== month ? w.title.slice(-3) : ''
}

function Charts({ d }: { d: ProgressResponse }) {
  const desk = useIsDesk()
  const current = d.weeks.findIndex((w) => w.current)
  const items: BarItem[] = d.weeks.map((w, i) => ({ key: w.key, label: labelOf(w, i, d.weeks), planned: w.plannedKm, done: w.doneKm, current: w.current }))
  const pts = (pick: (w: ProgressWeek) => number | null) => d.weeks.map((w, i) => ({ key: w.key, label: labelOf(w, i, d.weeks), value: pick(w) }))
  const easy = pts((w) => w.easyPace), pred = pts((w) => w.predicted)
  const firstEasy = d.weeks.find((w) => w.easyPace != null)?.easyPace, lastEasy = [...d.weeks].reverse().find((w) => w.easyPace != null)?.easyPace
  const firstPred = d.weeks.find((w) => w.predicted != null)?.predicted, lastPred = [...d.weeks].reverse().find((w) => w.predicted != null)?.predicted
  const h = desk ? 200 : 170
  return (
    <>
      <section className="card" aria-labelledby="ch-dist">
        <Head id="ch-dist" title="Weekly distance" note={`${round(d.weeks.reduce((t, w) => t + w.doneKm, 0))} km run`} />
        <WeekBars animate key={d.range} items={items} initial={current >= 0 ? current : null} height={desk ? 170 : 140} label="Weekly distance, planned as an outline and done as a fill."
          readout={(_, i) => {
            const w = d.weeks[i]!
            return <><b className="font-semibold text-ink">{w.title}{w.current ? ', this week' : ''}</b> · {w.plannedKm != null ? `${w.doneKm} of ${w.plannedKm} km` : `${w.doneKm} km, before the plan`}{w.note ? ` · ${w.note}` : ''}</>
          }} />
      </section>
      <section className="card" aria-labelledby="ch-easy">
        <Head id="ch-easy" title="Easy pace" note={firstEasy && lastEasy ? `${fmtPace(firstEasy)} to ${fmtPace(lastEasy)} /km` : undefined} />
        <LineChart points={easy} invert step={10} height={h} format={fmtPace} label="Easy pace per week, in minutes per km; faster is higher." axisNote="Faster is higher"
          readout={(p) => { const w = d.weeks.find((x) => x.key === p.key)!; return p.value == null ? <><b className="font-semibold text-ink">{w.title}</b> · no easy runs yet</> : <><b className="font-semibold text-ink">{w.title}</b> · easy runs at {fmtPace(p.value)}/km</> }} />
      </section>
      <section className="card" aria-labelledby="ch-pred">
        <Head id="ch-pred" title="Predicted race time" note={firstPred && lastPred ? `${fmtDuration(firstPred)} to ${fmtDuration(lastPred)}` : undefined} />
        <LineChart points={pred} invert step={120} height={h} format={hm} goal={d.goal} goalLabel="Goal" label="Predicted half-marathon time per week, against the goal; faster is higher." axisNote="Faster is higher · from your watch"
          initial={null}
          readout={(p) => { const w = d.weeks.find((x) => x.key === p.key)!; return p.value == null ? <><b className="font-semibold text-ink">{w.title}</b> · no runs yet</> : <><b className="font-semibold text-ink">{w.title}</b> · predicted {fmtDuration(p.value)}{d.goal ? ` · ${fmtDuration(Math.abs(p.value - d.goal))} ${p.value > d.goal ? 'over' : 'under'} goal` : ''}</> }} />
      </section>
    </>
  )
}
const round = (n: number) => Math.round(n * 10) / 10
const Head = ({ id, title, note }: { id: string; title: string; note?: string }) => (
  <div className="flex items-baseline justify-between gap-3"><h2 id={id} className="text-[15px] font-semibold">{title}</h2>{note && <span className="muted text-[14px]">{note}</span>}</div>
)

function Consistency({ d }: { d: ProgressResponse }) {
  const c = d.consistency
  if (!c.planned) return null
  const planWeeks = d.weeks.filter((w) => /^\d+$/.test(w.label) && !w.current)
  const span = planWeeks.length ? `weeks ${planWeeks[0]!.label} to ${planWeeks.at(-1)!.label}` : 'this plan'
  return (
    <section className="card" aria-labelledby="ch-cons">
      <h2 id="ch-cons" className="text-[15px] font-semibold">Consistency</h2>
      <p className="mt-2 flex items-baseline gap-2"><b className="disp text-[56px]">{c.done}</b><span className="text-[17px] font-semibold">of {c.planned}</span></p>
      <p className="muted text-[14px]">planned runs done in {span}</p>
      <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(10px,1fr))] gap-[3px]" aria-hidden>
        {Array.from({ length: c.planned }, (_, i) => <span key={i} className={`h-2 rounded-full ${i < c.done ? 'bg-ink' : 'ring-[1.5px] ring-ink ring-inset'}`} />)}
      </div>
      {c.missed.length > 0 && <p className="mt-3 text-[14px]">Missed: {c.missed.join(', ')}. The plan moved it into the next week.</p>}
    </section>
  )
}

function Recent({ d }: { d: ProgressResponse }) {
  return (
    <section className="card" aria-labelledby="ch-runs">
      <h2 id="ch-runs" className="mb-1 text-[15px] font-semibold">Recent runs</h2>
      <ul>{d.runs.map((r) => <li key={r.id} className="border-t border-line first:border-t-0"><RunRow run={r} to={r.workoutId ? `/workout/${r.workoutId}` : undefined} /></li>)}</ul>
    </section>
  )
}
