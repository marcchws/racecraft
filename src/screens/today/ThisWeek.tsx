import { Link } from 'react-router'
import type { WeekView } from '@/api/types'
import { dateOfMonth, dayShort, weekday } from '@/domain/dates'
import { Icon } from '@/ui/Icon'
import { KindTile } from '../workout/parts'

/** One row per day: glyph, name, km, where it moved from, and Today or Done. */
export function ThisWeek({ week, today, title = 'This week', linkRows = true }: { week: WeekView; today: string; title?: string; linkRows?: boolean }) {
  return (
    <section className="card" aria-labelledby={`wk-${week.n}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id={`wk-${week.n}`} className="text-[15px] font-semibold">{title}</h2>
        <span className="muted text-[14px]">Week {week.n} · {week.plannedKm} km planned</span>
      </div>
      <ul>{week.days.map((d) => <DayRow key={d.id} day={d} today={today} run={week.runs[d.id]} link={linkRows} />)}</ul>
    </section>
  )
}

type RowProps = { day: WeekView['days'][number]; today: string; run?: WeekView['runs'][string]; link?: boolean }
export const DayRow = (p: RowProps) => <li className="border-t border-line first:border-t-0"><DayLine {...p} /></li>

export function DayLine({ day: d, today, run, link = true }: RowProps) {
  const rest = d.kind === 'rest'
  const missed = d.status === 'missed' || d.status === 'skipped'
  const sub = rest ? null
    : d.movedFrom ? <><Icon name="adjust" size={14} />{d.km.toFixed(1)} km · moved from week {d.movedFrom.week}</>
    : missed && d.movedTo ? <><Icon name="adjust" size={14} />{d.status === 'missed' ? 'Missed' : 'Skipped'} · moved to week {d.movedTo.week}, {dayShort(weekday(d.movedTo.date))}</>
    : run ? <>{run.km.toFixed(1)} of {d.km.toFixed(1)} km{run.feel ? ` · felt ${run.feel.toLowerCase()}` : ''}</>
    : <>{d.km.toFixed(1)} km</>
  const chip = d.date === today && !missed ? <span className="chip chip-today">Today</span>
    : d.status === 'done' ? <span className="chip chip-done"><Icon name="check" size={14} />Done</span>
    : missed ? <span className="chip chip-missed"><Icon name="missed" size={14} />{d.status === 'missed' ? 'Missed' : 'Skipped'}</span>
    : null
  const body = (
    <>
      <span className="grid leading-[1.1] text-[12px] text-muted"><span>{dayShort(weekday(d.date))}</span><b className="text-[17px] font-semibold text-ink">{dateOfMonth(d.date)}</b></span>
      <KindTile kind={d.kind} />
      <span className="min-w-0">
        <b className={`block ${rest ? 'font-medium text-muted' : 'font-semibold'} ${missed ? 'line-through decoration-1' : ''}`}>{d.title}</b>
        {sub && <span className="inline-flex items-center gap-1 text-[13px] text-muted">{sub}</span>}
      </span>
      {chip ?? <span />}
    </>
  )
  const cls = 'grid grid-cols-[44px_32px_1fr_auto] items-center gap-2.5 py-2.5'
  return link && !rest ? <Link to={`/workout/${d.id}`} className={`${cls} -mx-2 rounded-[8px] px-2 hover:bg-chalk`}>{body}</Link> : <div className={cls}>{body}</div>
}
