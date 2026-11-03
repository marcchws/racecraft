import { Link, useNavigate, useParams } from 'react-router'
import { HttpError } from '@/api/client'
import { useWorkout } from '@/api/queries'
import { useIsDesk } from '@/app/Shell'
import { WorkoutShape } from '@/charts/WorkoutShape'
import { fmtDay } from '@/domain/dates'
import { fmtPace } from '@/domain/pace'
import { Icon } from '@/ui/Icon'
import { LoadError, Loading, NoPlan, SceneCard, Sk } from '../shared'
import { DoneResult, KIND_LABEL, metaOf, MoreMenu, SendButton, Steps, Why } from './parts'

/** Any day's workout on its own route: the steps, why it is there, and after the run, the result. */
export function WorkoutScreen() {
  const { id = '' } = useParams()
  const q = useWorkout(id)
  const desk = useIsDesk()
  const navigate = useNavigate()
  const back = (
    <button onClick={() => (history.length > 1 ? navigate(-1) : navigate('/plan'))} className="-ml-1 inline-flex items-center gap-1 rounded-[6px] py-1 pr-2 text-[14px] text-muted hover:text-ink">
      <Icon name="back" size={18} />Back
    </button>
  )
  if (q.isPending) return <>{back}<Loading><Sk h={120} /><Sk h={88} /><Sk h={220} /></Loading></>
  if (q.isError) {
    if (q.error instanceof HttpError && q.error.code === 'no-plan') return <NoPlan />
    if (q.error instanceof HttpError && q.error.status === 404) {
      return <>{back}<SceneCard scene="broken" title="No such workout" actions={<Link to="/plan" className="btn btn-primary">Open your plan</Link>}>This workout isn't in your plan. It may have moved when the plan adjusted.</SceneCard></>
    }
    return <>{back}<LoadError what="this workout" onRetry={() => q.refetch()} /></>
  }
  const { workout: w, run, week, now } = q.data
  const rest = w.kind === 'rest'
  const missed = w.status === 'missed' || w.status === 'skipped'
  const status = missed ? `${w.status === 'missed' ? 'Missed' : 'Skipped'}${w.movedTo ? ` · moved to ${fmtDay(w.movedTo.date)}` : ''}` : w.status === 'done' ? 'Done' : w.date === now.date ? 'Today' : w.date < now.date ? 'Past' : 'Planned'

  const header = (
    <div>
      <div className="flex items-center justify-between">
        <span className="tag">Week {w.week} · {KIND_LABEL[w.kind]} · {fmtDay(w.date)}</span>
        <MoreMenu workout={w} week={week} now={now} />
      </div>
      <h1 className={`disp mt-2.5 mb-1.5 ${desk ? 'text-[64px]' : 'text-[44px]'}`}>{w.title}</h1>
      {!rest && <p className="muted text-[14px]">{metaOf(w)}</p>}
      <p className="mt-2 flex flex-wrap gap-2">
        <span className={`chip ${missed ? 'chip-missed' : w.status === 'done' ? 'chip-done' : w.date === now.date ? 'chip-today' : 'chip-plain'}`}>{status}</span>
        {w.movedFrom && <span className="chip chip-plain"><Icon name="adjust" size={14} />Moved from week {w.movedFrom.week}</span>}
      </p>
    </div>
  )
  if (rest) {
    return <>{back}<SceneCard scene="rest" title={`Rest · ${fmtDay(w.date)}`} actions={<Link to="/plan" className="btn">Back to the plan</Link>}>{w.why} Nothing to send to your watch today.</SceneCard></>
  }
  const shape = <div className="card"><WorkoutShape blocks={w.blocks} summary={w.summary} height={desk ? 88 : 72} /></div>
  const steps = <section className="card" aria-label="Steps"><span className="tag">Steps</span><Steps steps={w.steps} /></section>
  const why = <section className="card"><Why text={w.why} movedFrom={w.movedFrom} /></section>
  const after = run
    ? <section className="card"><span className="tag">After the run</span><DoneResult run={run} workout={w} /><Splits splits={run.splits} /></section>
    : !missed && w.date >= now.date && w.status === 'planned'
      ? <section className="card"><span className="tag">Before you go</span><p className="mt-1.5 text-[14px] text-muted">Send it and your watch guides each block. The run comes back here when your watch syncs.</p><div className="mt-3"><SendButton workout={w} className="w-full desk:w-auto" /></div></section>
      : null

  return desk ? (
    <>
      {back}
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
        <div className="grid gap-4">{header}{shape}{steps}</div>
        <div className="grid gap-4">{after}{why}</div>
      </div>
    </>
  ) : <>{back}{header}{shape}{after}{steps}{why}</>
}

function Splits({ splits }: { splits: number[] }) {
  const fastest = Math.min(...splits)
  return (
    <details className="mt-4 border-t border-line pt-3">
      <summary className="cursor-pointer font-semibold">Km splits</summary>
      <ol className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[14px]">
        {splits.map((s, i) => (
          <li key={i} className="flex justify-between border-b border-line py-1">
            <span className="text-muted">{i === splits.length - 1 && splits.length > 1 ? 'Last' : `Km ${i + 1}`}</span>
            <span className={s === fastest ? 'font-semibold' : ''}>{fmtPace(s)}{s === fastest ? ' · fastest' : ''}</span>
          </li>
        ))}
      </ol>
    </details>
  )
}
