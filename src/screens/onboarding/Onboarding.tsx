import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useBuildPlan, useConnectWatch, useMe, useRaces } from '@/api/queries'
import type { Level, NewPlanRequest } from '@/api/types'
import { useDesk } from '@/app/Shell'
import { dayName, dayShort, fmtDay } from '@/domain/dates'
import { DEMO_NOW } from '@/domain/seed'
import { daysProblem, estimateFinish, levelProblem, raceProblem, weeksUntil } from '@/domain/estimate'
import { fmtDuration, fmtPace, pacesFromGoal, parseDuration, RACE_KM } from '@/domain/pace'
import type { RaceDistance, Weekday } from '@/domain/types'
import { Bend, Mark } from '@/ui/Bend'
import { Icon } from '@/ui/Icon'
import { Select } from '@/ui/select'
import { useToast } from '@/ui/toast'

const STEPS = ['Race', 'Level', 'Days', 'Watch', 'Summary'] as const
type StepName = (typeof STEPS)[number]
const DISTANCES: RaceDistance[] = ['5K', '10K', 'Half']
const distLabel = (d: RaceDistance) => (d === 'Half' ? 'Half marathon' : d)

interface Draft {
  raceId: string | null
  own: { name: string; distance: RaceDistance | null; date: string }
  levelKind: 'race' | 'km'
  levelDistance: RaceDistance
  levelTime: string
  levelKm: string
  runDays: Weekday[]
  longDay: Weekday | null
  longPicked: boolean
  watch: 'connected' | 'skipped' | null
}
const EMPTY: Draft = { raceId: null, own: { name: '', distance: null, date: '' }, levelKind: 'race', levelDistance: '10K', levelTime: '', levelKm: '', runDays: [], longDay: null, longPicked: false, watch: null }

export function Onboarding() {
  const desk = useDesk()
  const navigate = useNavigate()
  const toast = useToast()
  const races = useRaces()
  const me = useMe()
  const build = useBuildPlan()
  const connect = useConnectWatch()
  const now = me.data?.now ?? DEMO_NOW
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>(EMPTY)
  const [tried, setTried] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { document.title = 'Build your plan · Racecraft' }, [])
  useEffect(() => { heading.current?.focus() }, [step])

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const race = d.raceId === 'own'
    ? d.own.distance && d.own.date ? { name: d.own.name.trim() || 'Your race', distance: d.own.distance, date: d.own.date } : null
    : races.data?.find((r) => r.id === d.raceId) ?? null
  const time = parseDuration(d.levelTime), km = d.levelKm.trim() ? Number(d.levelKm) : null
  const level: Level | null = d.levelKind === 'race' ? (time ? { kind: 'race', distance: d.levelDistance, time } : null) : km != null && !Number.isNaN(km) ? { kind: 'km', km } : null

  const problems: Record<StepName, string | null> = {
    Race: d.raceId === null ? 'Pick a race, or add your own.'
      : d.raceId === 'own' && (!d.own.name.trim() || !d.own.distance || !d.own.date) ? 'Give your race a name, a distance and a date.'
      : race ? raceProblem(now, race.distance, race.date, race.name) : null,
    Level: levelProblem({ kind: d.levelKind, time, km }),
    Days: daysProblem(d.runDays, d.longDay),
    Watch: d.watch ? null : 'Connect your watch or skip this step.',
    Summary: null,
  }
  const name = STEPS[step]!
  const problem = tried ? problems[name] : null
  const next = () => {
    if (problems[name]) { setTried(true); return }
    setTried(false)
    setStep((s) => s + 1)
  }
  const back = () => { setTried(false); setStep((s) => Math.max(0, s - 1)) }
  const submit = () => {
    if (!race || !level || d.longDay === null) return
    const req: NewPlanRequest = {
      race: d.raceId === 'own' ? { name: race.name, distance: race.distance, date: race.date } : { id: d.raceId! },
      level, runDays: d.runDays, longDay: d.longDay,
    }
    build.mutate(req, {
      onSuccess: () => {
        toast({ message: `Your plan is ready: ${weeksUntil(now, race.date)} weeks to the ${race.name}. Week 1 starts today.` })
        navigate('/')
      },
    })
  }

  if (build.isPending || build.isError) {
    return (
      <Frame desk={desk} step={4} onBack={build.isError ? () => build.reset() : undefined}>
        <div className="grid justify-items-center gap-2 pt-10 text-center" role="status" aria-live="polite">
          <Bend name={build.isError ? 'broken' : 'start'} width={240} />
          <h1 className="disp mt-1 text-[40px]" ref={heading} tabIndex={-1}>{build.isError ? "Couldn't build your plan" : 'Building your plan'}</h1>
          <p className="max-w-[340px] text-muted">{build.isError
            ? 'The plan service did not answer. Your answers are kept: try again.'
            : `Laying out ${race ? weeksUntil(now, race.date) : ''} weeks, the paces from your level and a long run every ${d.longDay !== null ? dayName(d.longDay) : 'week'}.`}</p>
          {build.isPending ? <span className="mt-4 inline-flex items-center gap-2 font-semibold"><span className="spin" aria-hidden />Usually two seconds</span>
            : <div className="mt-4 grid w-full max-w-[320px] gap-2"><button className="btn btn-primary" onClick={submit}>Try again</button><button className="btn" onClick={() => build.reset()}>Back to the summary</button></div>}
        </div>
      </Frame>
    )
  }

  const estimate = race && level ? estimateFinish(level, race.distance) : null
  const titles: Record<StepName, [string, string]> = {
    Race: ['Your race', 'Pick the race the plan builds toward.'],
    Level: ['Your level', 'A recent race time, or the km you run in a week. It sets your paces.'],
    Days: ['Your week', 'The days you can run, and the one for the long run.'],
    Watch: ['Your watch', 'Workouts go to it, and runs come back from it. Nothing to log by hand.'],
    Summary: ['Ready to build', 'Check it once. You can change the run days later.'],
  }
  return (
    <Frame desk={desk} step={step} onBack={step ? back : undefined}>
      <h1 className="disp text-[40px] outline-none" ref={heading} tabIndex={-1}>{titles[name][0]}</h1>
      <p className="mt-1 text-muted">{titles[name][1]}</p>
      <div className="mt-5 grid gap-4">
        {name === 'Race' && <RaceStep d={d} set={set} races={races.data ?? []} loading={races.isPending} invalid={!!problem} now={now} />}
        {name === 'Level' && <LevelStep d={d} set={set} invalid={!!problem} estimate={estimate} race={race} />}
        {name === 'Days' && <DaysStep d={d} set={set} invalid={!!problem} />}
        {name === 'Watch' && (
          <div className="grid gap-3">
            <div className="card flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[8px] bg-soft"><Icon name="watch" /></span>
              <div className="flex-1"><b className="block font-semibold">{d.watch === 'connected' || me.data?.watch.connected ? 'Watch connected' : 'Connect your watch'}</b><span className="muted text-[14px]">{d.watch === 'connected' || me.data?.watch.connected ? 'Workouts go out, runs come back.' : 'A mocked connection for the demo.'}</span></div>
              {d.watch === 'connected' || me.data?.watch.connected ? <Icon name="check" className="text-good" label="Connected" />
                : <button className="btn btn-sm" aria-busy={connect.isPending || undefined} onClick={() => connect.mutate(undefined, { onSuccess: () => set({ watch: 'connected' }) })}>{connect.isPending ? <><span className="spin" aria-hidden />Connecting</> : 'Connect'}</button>}
            </div>
            {me.data?.watch.connected && d.watch !== 'connected' && <button className="btn" onClick={() => set({ watch: 'connected' })}>Use this watch</button>}
            {d.watch !== 'connected' && !me.data?.watch.connected && <button className="btn" aria-pressed={d.watch === 'skipped'} onClick={() => { set({ watch: 'skipped' }); setTried(false); setStep(4) }}>Skip for now</button>}
          </div>
        )}
        {name === 'Summary' && race && level && d.longDay !== null && (
          <Summary rows={[
            ['Race', `${race.name} · ${distLabel(race.distance)} · ${fmtDay(race.date)}`, 0],
            ['Plan', `${weeksUntil(now, race.date)} weeks, starting today`, 0],
            ['Level', level.kind === 'race' ? `${distLabel(level.distance)} in ${fmtDuration(level.time)}` : `${level.km} km a week`, 1],
            ['Run days', `${d.runDays.map((x) => dayShort(x)).join(', ')} · long run ${dayName(d.longDay)}`, 2],
            ['Watch', d.watch === 'connected' || me.data?.watch.connected ? 'Connected' : 'Not connected, connect it later from You', 3],
            ['Starting estimate', estimate ? `${fmtDuration(estimate)} (${fmtPace(estimate / RACE_KM[race.distance])}/km)` : '', 1],
          ]} onEdit={(s) => setStep(s)} />
        )}
      </div>
      {/* The error sits with the button that raised it, so it stays in view on a long step. */}
      <div className="sticky bottom-0 mt-6 grid gap-2 bg-chalk pt-3 pb-[max(16px,env(safe-area-inset-bottom))] desk:static desk:bg-transparent">
        {problem && <p className="err" role="alert" id="step-error"><Icon name="alert" size={18} className="mt-px" />{problem}</p>}
        {name === 'Summary'
          ? <button className="btn btn-primary w-full" onClick={submit}>Build my plan</button>
          : name === 'Watch' && !d.watch && !me.data?.watch.connected ? null
          : <button className="btn btn-primary w-full" onClick={next} aria-describedby={problem ? 'step-error' : undefined}>Continue</button>}
      </div>
    </Frame>
  )
}

function Frame({ desk, step, onBack, children }: { desk: boolean; step: number; onBack?: () => void; children: ReactNode }) {
  return (
    <div className={`min-h-dvh ${desk ? 'bg-canvas py-10' : 'bg-chalk'}`}>
      <div className={desk ? 'card mx-auto w-full max-w-[560px] px-8 pt-6 pb-8' : 'mx-auto max-w-[520px] px-4 pt-4'}>
        <header className="flex items-center justify-between gap-3">
          {onBack ? <button className="icon-btn -ml-2" onClick={onBack} aria-label="Previous step"><Icon name="back" /></button> : <Link to="/" aria-label="Racecraft, Today" className="rounded-[6px]"><Mark /></Link>}
          <span className="text-[13px] font-semibold text-muted">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
          <Link to="/" className="icon-btn -mr-2" aria-label="Close and go back to Today"><Icon name="close" /></Link>
        </header>
        <div className="mt-3 mb-6 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Plan setup" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <main>{children}</main>
      </div>
    </div>
  )
}

type StepProps = { d: Draft; set: (p: Partial<Draft>) => void; invalid: boolean }

function RaceStep({ d, set, races, loading, invalid, now }: StepProps & { races: NonNullable<ReturnType<typeof useRaces>['data']>; loading: boolean; now: typeof DEMO_NOW }) {
  const sorted = [...races].sort((a, b) => (a.date < b.date ? -1 : 1))
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Race" aria-invalid={invalid || undefined}>
      {loading && Array.from({ length: 4 }, (_, i) => <div key={i} className="sk h-[68px]" />)}
      {sorted.map((r) => {
        const on = d.raceId === r.id, weeks = weeksUntil(now, r.date)
        return (
          <Choice key={r.id} on={on} invalid={invalid && on} onClick={() => set({ raceId: r.id })}>
            <span className="min-w-0 flex-1"><b className="block font-semibold">{r.name}</b><span className="text-[13px] text-muted">{distLabel(r.distance)} · {fmtDay(r.date)} · {weeks} weeks away</span></span>
          </Choice>
        )
      })}
      <Choice on={d.raceId === 'own'} invalid={invalid && d.raceId === 'own'} onClick={() => set({ raceId: 'own' })}>
        <span className="flex-1"><b className="flex items-center gap-1.5 font-semibold"><Icon name="plus" size={16} />My own race</b><span className="text-[13px] text-muted">Any 5K, 10K or half</span></span>
      </Choice>
      {d.raceId === 'own' && (
        <div className="card grid gap-3">
          <div className="field"><label htmlFor="own-name">Race name</label><input id="own-name" className="input" value={d.own.name} onChange={(e) => set({ own: { ...d.own, name: e.target.value } })} placeholder="Ibirapuera Night Run" aria-invalid={invalid && !d.own.name.trim() || undefined} /></div>
          <div className="field"><span className="field-label" id="own-dist">Distance</span>
            <div className="seg" role="radiogroup" aria-labelledby="own-dist">
              {DISTANCES.map((x) => <button key={x} role="radio" aria-checked={d.own.distance === x} onClick={() => set({ own: { ...d.own, distance: x } })}>{distLabel(x)}</button>)}
            </div>
          </div>
          <div className="field"><label htmlFor="own-date">Date</label><input id="own-date" type="date" className="input" min={now.date} value={d.own.date} onChange={(e) => set({ own: { ...d.own, date: e.target.value } })} aria-invalid={invalid && !!d.own.date || undefined} /></div>
        </div>
      )}
    </div>
  )
}

function LevelStep({ d, set, invalid, estimate, race }: StepProps & { estimate: number | null; race: { name: string; distance: RaceDistance } | null }) {
  const p = estimate && race ? pacesFromGoal(Math.floor(estimate / RACE_KM[race.distance])) : null
  return (
    <>
      <div className="seg w-full" role="radiogroup" aria-label="How to set your level">
        <button role="radio" aria-checked={d.levelKind === 'race'} onClick={() => set({ levelKind: 'race' })}>A recent race</button>
        <button role="radio" aria-checked={d.levelKind === 'km'} onClick={() => set({ levelKind: 'km' })}>Weekly km</button>
      </div>
      {d.levelKind === 'race' ? (
        <div className="grid grid-cols-[1fr_1fr] gap-3">
          <div className="field"><label htmlFor="lv-dist">Distance</label>
            <Select id="lv-dist" label="Distance of your recent race" value={d.levelDistance} onChange={(v) => set({ levelDistance: v })} options={DISTANCES.map((x) => ({ value: x, label: distLabel(x) }))} />
          </div>
          <div className="field"><label htmlFor="lv-time">Time</label>
            <input id="lv-time" className="input" inputMode="numeric" placeholder={d.levelDistance === 'Half' ? '1:58:00' : d.levelDistance === '10K' ? '52:30' : '25:10'} value={d.levelTime}
              onChange={(e) => set({ levelTime: e.target.value })} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'step-error' : undefined} />
          </div>
        </div>
      ) : (
        <div className="field"><label htmlFor="lv-km">Km in a usual week</label>
          <input id="lv-km" className="input" inputMode="decimal" placeholder="20" value={d.levelKm} onChange={(e) => set({ levelKm: e.target.value.replace(',', '.') })} aria-invalid={invalid || undefined} aria-describedby={invalid ? 'step-error' : undefined} />
        </div>
      )}
      <div className="rounded-[12px] border border-line bg-card p-3.5 text-[14px]" aria-live="polite">
        {estimate && race && p
          ? <><b className="block font-semibold">Starting estimate: {fmtDuration(estimate)} for the {race.name}</b><span className="text-muted">Easy runs at {fmtPace(p.easy)}, tempo at {fmtPace(p.tempo)}, reps at {fmtPace(p.rep)} per km. {d.levelKind === 'km' ? 'A guess from km alone; your first runs sharpen it.' : "Riegel's formula from your race."}</span></>
          : <span className="text-muted">Your paces show here as you type.</span>}
      </div>
    </>
  )
}

function DaysStep({ d, set, invalid }: StepProps) {
  // Until she picks one, the long run sits on the weekend: Sunday, else Saturday, else her last run day.
  const toggle = (x: Weekday) => {
    const runDays = d.runDays.includes(x) ? d.runDays.filter((y) => y !== x) : [...d.runDays, x].sort((a, b) => a - b)
    const kept = d.longPicked && d.longDay !== null && runDays.includes(d.longDay)
    set({ runDays, longPicked: kept, longDay: kept ? d.longDay : runDays.includes(6) ? 6 : runDays.includes(5) ? 5 : runDays.at(-1) ?? null })
  }
  return (
    <>
      <div className="field">
        <span className="field-label" id="days-l">Run days <span className="font-normal text-muted">· at least three</span></span>
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-labelledby="days-l">
          {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((x) => {
            const on = d.runDays.includes(x)
            return <button key={x} aria-pressed={on} onClick={() => toggle(x)}
              className={`h-12 rounded-[6px] border text-[14px] font-semibold ${on ? 'border-ink bg-ink text-white' : invalid ? 'border-red bg-card' : 'border-line-strong bg-card hover:border-ink'}`}><DayName d={x} /></button>
          })}
        </div>
      </div>
      <div className="field"><label htmlFor="long-day">Long-run day</label>
        <Select id="long-day" label="Long-run day" placeholder="Pick from your run days" value={d.longDay !== null ? String(d.longDay) : null} onChange={(v) => set({ longDay: Number(v) as Weekday, longPicked: true })}
          options={d.runDays.map((x) => ({ value: String(x), label: dayName(x) }))} />
      </div>
      {d.runDays.length >= 3 && <p className="text-[14px] text-muted">{d.runDays.length} runs a week: one with reps, one steady, {d.runDays.length > 3 ? `${d.runDays.length - 3} easy and ` : ''}the long run.</p>}
    </>
  )
}

/** "Mon" on screen, "Monday" to a screen reader, without an aria-label that would disagree with the visible text. */
const DayName = ({ d }: { d: Weekday }) => <><span aria-hidden>{dayShort(d)}</span><span className="sr-only">{dayName(d)}</span></>

function Summary({ rows, onEdit }: { rows: [string, string, number][]; onEdit: (step: number) => void }) {
  return (
    <dl className="card divide-y divide-line py-1">
      {rows.map(([k, v, s]) => (
        <div key={k} className="py-3">
          <dt className="text-[13px] text-muted">{k}</dt>
          <dd className="flex items-center justify-between gap-3">
            <span className="font-semibold">{v}</span>
            {k !== 'Starting estimate' && k !== 'Plan' && <button className="btn btn-sm -my-1.5 shrink-0" onClick={() => onEdit(s)}>Change<span className="sr-only"> {k.toLowerCase()}</span></button>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function Choice({ on, invalid, onClick, children }: { on: boolean; invalid: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button role="radio" aria-checked={on} onClick={onClick}
      className={`flex min-h-[64px] items-center gap-3 rounded-[12px] border bg-card px-4 py-3 text-left ${invalid ? 'border-red shadow-[0_0_0_1px_var(--color-red)]' : on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line-strong hover:border-ink'}`}>
      {children}
      <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-ink' : 'border-line-strong'}`}>{on && <i className="size-2.5 rounded-full bg-ink" />}</span>
    </button>
  )
}
