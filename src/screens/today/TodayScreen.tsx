import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isNoPlan } from '@/api/client'
import { useToday } from '@/api/queries'
import type { TodayResponse } from '@/api/types'
import { PageHead, useIsDesk } from '@/app/Shell'
import { WorkoutShape } from '@/charts/WorkoutShape'
import { fmtDay, fmtDayLong } from '@/domain/dates'
import type { Week, Workout } from '@/domain/types'
import { Bend } from '@/ui/Bend'
import { Icon } from '@/ui/Icon'
import { Sheet } from '@/ui/overlay'
import { DoneResult, KIND_LABEL, KindTile, metaOf, MoreMenu, SendButton, Steps, Why } from '../workout/parts'
import { AdjustNote, LoadError, Loading, NoPlan, RaceCard, Sk, WatchNote, WeekStrip } from '../shared'
import { ThisWeek } from './ThisWeek'

const greeting = (time: string) => (time < '12:00' ? 'Good morning' : time < '18:00' ? 'Good afternoon' : 'Good evening')

export function TodayScreen() {
  const [params] = useSearchParams()
  if (params.get('state') === 'crash') throw new Error('A forced error, to show the error page.')
  const desk = useIsDesk()
  const q = useToday()

  if (q.isPending) {
    return (
      <>
        <PageHead kicker={<Sk h={18} w={180} />} title="Today" />
        <Loading>
          {desk
            ? <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5"><div className="grid gap-4"><Sk h={420} /><Sk h={64} /></div><div className="grid gap-4"><Sk h={300} /><Sk h={360} /></div></div>
            : <><Sk h={58} /><Sk h={330} /><Sk h={64} /><Sk h={250} /></>}
        </Loading>
      </>
    )
  }
  if (q.isError) {
    const body = isNoPlan(q.error) ? <NoPlan /> : <LoadError onRetry={() => q.refetch()} />
    return (
      <>
        <PageHead kicker="Tuesday 3 November" title={isNoPlan(q.error) ? 'Welcome, Luísa' : 'Today'} />
        {desk ? <div className="max-w-[560px]">{body}</div> : body}
      </>
    )
  }
  return <TodayLive d={q.data} />
}

function TodayLive({ d }: { d: TodayResponse }) {
  const desk = useIsDesk()
  const rest = d.today.kind === 'rest'
  const note = d.watch.failing ? <WatchNote watch={d.watch} /> : d.adjustment ? <AdjustNote adjustment={d.adjustment} /> : null
  const race = <RaceCard {...d} />
  const head = <PageHead kicker={`${fmtDayLong(d.now.date)}${desk ? ` · ${d.now.time}` : ''}`} title={`${greeting(d.now.time)}, ${d.runner.name}`} aside={desk ? <WeekStrip days={d.week.days} today={d.now.date} className="w-[420px]" /> : undefined} />

  const main = rest
    ? <><RestCard d={d} />{d.next && <NextCard workout={d.next} />}</>
    : <><Session d={d} wide={desk} />{note}</>

  if (desk) {
    return (
      <>
        {head}
        <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5">
          <div className="grid gap-4">{main}{rest && note}</div>
          <div className="grid gap-4">{race}<ThisWeek week={d.week} today={d.now.date} /></div>
        </div>
      </>
    )
  }
  return <>{head}<WeekStrip days={d.week.days} today={d.now.date} />{main}{rest && note}{race}</>
}

function Session({ d, wide }: { d: TodayResponse; wide: boolean }) {
  const [sheet, setSheet] = useState(false)
  const w = d.today
  const week: Week = d.week
  const skipped = w.status === 'skipped'
  return (
    <section className="card card-ink on-ink" aria-labelledby="s-title">
      <div className="flex items-center justify-between">
        <span className="tag"><Icon name={w.kind} size={16} />Today · {KIND_LABEL[w.kind]}</span>
        <MoreMenu workout={w} week={week} now={d.now} onInk />
      </div>
      <h2 id="s-title" className={`disp mt-2.5 mb-1.5 ${wide ? 'text-[64px]' : 'text-[44px]'}`}>{w.title}</h2>
      <p className="muted text-[14px]">{metaOf(w)}</p>
      <WorkoutShape blocks={w.blocks} summary={w.summary} height={wide ? 88 : 64} onInk />
      {wide && <><Steps steps={w.steps} onInk /><div className="mt-4"><Why text={w.why} movedFrom={w.movedFrom} /></div></>}
      {d.run ? <DoneResult run={d.run} workout={w} onInk />
        : skipped ? <p className="mt-4 flex items-center gap-2 font-semibold"><span className="chip chip-missed">Skipped</span>The plan moved it. Undo from the toast, or see Plan.</p>
        : (
          <div className={`mt-4 grid gap-2 ${wide ? 'grid-cols-[auto_1fr]' : 'grid-cols-[1fr_auto]'}`}>
            <SendButton workout={w} className={wide ? 'justify-self-start' : ''} />
            {!wide && <button className="btn" onClick={() => setSheet(true)}>Details</button>}
          </div>
        )}
      {!wide && (
        <Sheet open={sheet} onOpenChange={setSheet} tag={`Week ${w.week} · ${KIND_LABEL[w.kind]}`} title={w.title} description={metaOf(w, false)}>
          <Steps steps={w.steps} />
          <div className="mt-4"><Why text={w.why} movedFrom={w.movedFrom} /></div>
          <Link to={`/workout/${w.id}`} className="btn mt-5 w-full">Open the full workout</Link>
        </Sheet>
      )}
    </section>
  )
}

function RestCard({ d }: { d: TodayResponse }) {
  const yesterday = d.week.days.find((x) => x.date < d.now.date && x.status === 'done' && x.kind !== 'rest')
  return (
    <section className="card grid justify-items-center gap-2 px-5 pt-7 pb-6 text-center">
      <Bend name="rest" width={220} />
      <h2 className="disp mt-1 text-[36px]">Rest day</h2>
      <p className="max-w-[320px] text-muted">{yesterday?.kind === 'intervals' ? "Yesterday's reps land today. Sleep counts as training." : 'Rest is when the work turns into fitness. Sleep counts as training.'}</p>
    </section>
  )
}

function NextCard({ workout: w }: { workout: Workout }) {
  return (
    <Link to={`/workout/${w.id}`} className="card grid grid-cols-[40px_1fr_auto] items-center gap-3 hover:border-line-strong">
      <KindTile kind={w.kind} size={40} />
      <div><span className="tag">Next · {fmtDay(w.date)}</span><b className="disp mt-1 mb-0.5 block text-[28px]">{w.title}</b><span className="muted text-[14px]">{metaOf(w)}</span></div>
      <span aria-hidden className="text-muted">›</span>
    </Link>
  )
}
