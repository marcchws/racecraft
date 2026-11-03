import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useConnectWatch, useMe, useSettings, useSync } from '@/api/queries'
import type { MeResponse } from '@/api/types'
import { PageHead, useIsDesk } from '@/app/Shell'
import { dayName, dayShort, fmtDay } from '@/domain/dates'
import { daysProblem } from '@/domain/estimate'
import type { Weekday } from '@/domain/types'
import { db, resetDb, type Scenario } from '@/mocks/db'
import { Icon } from '@/ui/Icon'
import { Sheet } from '@/ui/overlay'
import { Select } from '@/ui/select'
import { useToast } from '@/ui/toast'
import { Loading, Sk } from '../shared'

export function YouScreen() {
  const q = useMe()
  const desk = useIsDesk()
  const head = <PageHead kicker={q.data ? `${q.data.runner.city}` : undefined} title={q.data ? q.data.runner.fullName : 'You'} />
  if (q.isPending) return <>{head}<Loading><Sk h={150} /><Sk h={260} /><Sk h={300} /></Loading></>
  if (q.isError) return <>{head}<Demo /></>
  const me = q.data
  return desk
    ? <>{head}<div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-5"><div className="grid gap-4"><Watch me={me} />{me.plan && <Settings me={me} />}</div><Demo /></div></>
    : <>{head}<Watch me={me} />{me.plan && <Settings me={me} />}<Demo /></>
}

function Watch({ me }: { me: MeResponse }) {
  const sync = useSync()
  const connect = useConnectWatch()
  const toast = useToast()
  const w = me.watch
  const last = `${w.lastSync.date === me.now.date ? 'today' : fmtDay(w.lastSync.date)} at ${w.lastSync.time}`
  const status = !w.connected ? 'Not connected' : w.failing ? 'Not syncing' : sync.isSuccess ? 'Synced just now' : 'Connected'
  return (
    <section className="card" aria-labelledby="watch-h">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[8px] bg-soft"><Icon name="watch" /></span>
        <div className="flex-1">
          <h2 id="watch-h" className="font-semibold">Your watch</h2>
          <p className="flex items-center gap-1.5 text-[14px] text-muted" aria-live="polite">
            {w.failing ? <Icon name="cloudOff" size={16} className="text-red-deep" /> : w.connected ? <Icon name="check" size={16} className="text-good" /> : null}
            {status}{w.connected ? ` · last sync ${last}` : ''}
          </p>
        </div>
      </div>
      {w.failing && <p className="mt-3 rounded-[10px] bg-red-soft px-3 py-2 text-[14px] text-red-deep">Your watch hasn't answered since {last}. Runs wait on it and come in once it's back.</p>}
      <div className="mt-4 grid gap-2 desk:grid-cols-[auto_1fr]">
        {w.connected
          ? <button className="btn" aria-busy={sync.isPending || undefined} onClick={() => sync.mutate(undefined, {
              onSuccess: (r) => toast({ message: r.newRuns ? `${r.newRuns} new runs synced.` : 'Synced. No new runs since your last one.' }),
              onError: () => toast({ message: "Couldn't reach your watch. Check it's nearby with Bluetooth on, then try again." }),
            })}>{sync.isPending ? <><span className="spin" aria-hidden />Syncing…</> : sync.isSuccess ? <><Icon name="check" />Synced</> : <><Icon name="sync" />Sync now</>}</button>
          : <button className="btn btn-primary" aria-busy={connect.isPending || undefined} onClick={() => connect.mutate()}>{connect.isPending ? <><span className="spin" aria-hidden />Connecting…</> : <><Icon name="watch" />Connect a watch</>}</button>}
      </div>
    </section>
  )
}

function Settings({ me }: { me: MeResponse }) {
  const plan = me.plan!
  const [runDays, setRunDays] = useState<Weekday[]>(plan.runDays)
  const [longDay, setLongDay] = useState<Weekday | null>(plan.longDay)
  const [confirm, setConfirm] = useState(false)
  const [tried, setTried] = useState(false)
  const save = useSettings()
  const toast = useToast()
  const changed = runDays.join() !== plan.runDays.join() || longDay !== plan.longDay
  const problem = daysProblem(runDays, longDay)
  const from = plan.currentWeek + 1
  const toggle = (x: Weekday) => {
    const next = runDays.includes(x) ? runDays.filter((y) => y !== x) : [...runDays, x].sort((a, b) => a - b)
    setRunDays(next)
    if (longDay !== null && !next.includes(longDay)) setLongDay(null)
  }
  const apply = () => save.mutate({ runDays, longDay: longDay! }, {
    onSuccess: (r) => { setConfirm(false); toast({ message: `Weeks ${r.from} to ${r.to} rebuilt: ${runDays.map((x) => dayShort(x)).join(', ')}, long run on ${dayName(longDay!)}.` }) },
    onError: () => { setConfirm(false); toast({ message: "Couldn't rebuild the plan. Nothing changed." }) },
  })
  return (
    <section className="card" aria-labelledby="set-h">
      <h2 id="set-h" className="font-semibold">Plan settings</h2>
      <p className="text-[14px] text-muted">Changing them rebuilds weeks {from} to {plan.weeksTotal}. Done weeks stay as they are.</p>
      <div className="mt-4 grid gap-4">
        <div className="field">
          <span className="field-label" id="set-days">Run days</span>
          <div className="grid grid-cols-7 gap-1.5" role="group" aria-labelledby="set-days">
            {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((x) => {
              const on = runDays.includes(x)
              return <button key={x} aria-pressed={on} onClick={() => toggle(x)} className={`h-11 rounded-[6px] border text-[14px] font-semibold ${on ? 'border-ink bg-ink text-white' : 'border-line-strong bg-card hover:border-ink'}`}><span aria-hidden>{dayShort(x)}</span><span className="sr-only">{dayName(x)}</span></button>
            })}
          </div>
        </div>
        <div className="field"><label htmlFor="set-long">Long-run day</label>
          <Select id="set-long" label="Long-run day" placeholder="Pick from your run days" value={longDay !== null ? String(longDay) : null} onChange={(v) => setLongDay(Number(v) as Weekday)} options={runDays.map((x) => ({ value: String(x), label: dayName(x) }))} invalid={tried && !!problem} />
        </div>
        {tried && problem && <p className="err" role="alert"><Icon name="alert" size={18} />{problem}</p>}
        <button className={`btn desk:justify-self-start ${changed ? 'btn-primary' : 'text-muted'}`} disabled={!changed}
          onClick={() => { if (problem) { setTried(true); return } setConfirm(true) }}>Save and rebuild</button>
      </div>
      <Sheet open={confirm} onOpenChange={setConfirm} tag="Plan settings" title={`Rebuild weeks ${from} to ${plan.weeksTotal}?`}>
        <p className="mt-3">Runs on {runDays.map((x) => dayName(x)).join(', ')}, with the long run on {longDay !== null ? dayName(longDay) : ''}. This week and the weeks you ran stay as they are.</p>
        <div className="mt-5 grid gap-2 desk:grid-cols-[auto_auto] desk:justify-end">
          <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={apply} aria-busy={save.isPending || undefined}>{save.isPending ? <><span className="spin" aria-hidden />Rebuilding…</> : 'Rebuild'}</button>
        </div>
      </Sheet>
    </section>
  )
}

const SCENARIOS: { id: Scenario; label: string; note: string }[] = [
  { id: 'live', label: 'Live', note: 'Week 7, as Luísa sees it this morning.' },
  { id: 'slow', label: 'Slow network', note: 'Every answer takes 1.5 to 3 seconds.' },
  { id: 'noplan', label: 'No plan yet', note: 'A new runner: no plan, no runs, no watch.' },
  { id: 'watchfail', label: 'Watch not syncing', note: 'Sync and Send to watch fail.' },
  { id: 'errors', label: 'Errors', note: 'Plan, progress and building a plan fail.' },
]

/** The demo's own controls: switch the mock scenario or start over, so every state is a tap away. */
function Demo() {
  const qc = useQueryClient()
  const toast = useToast()
  const [, setParams] = useSearchParams()
  const [scenario, setScenario] = useState<Scenario>(db.scenario)
  const pick = (s: Scenario) => {
    resetDb({ scenario: s })
    setScenario(s)
    setParams({}, { replace: true })
    qc.resetQueries()
    toast({ message: `Demo: ${SCENARIOS.find((x) => x.id === s)!.label}. Open Today, Plan or Progress to see it.` })
  }
  return (
    <section className="card" aria-labelledby="demo-h">
      <h2 id="demo-h" className="flex items-center gap-2 font-semibold"><Icon name="demo" />Demo</h2>
      <p className="text-[14px] text-muted">Luísa, her races and her runs are invented. Everything lives in this tab and starts over on reload.</p>
      <div className="mt-3 grid gap-1.5" role="radiogroup" aria-label="Demo scenario">
        {SCENARIOS.map((s) => {
          const on = scenario === s.id
          return (
            <button key={s.id} role="radio" aria-checked={on} onClick={() => pick(s.id)}
              className={`flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left ${on ? 'border-ink bg-chalk shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-line-strong'}`}>
              <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-ink' : 'border-line-strong'}`}>{on && <i className="size-2.5 rounded-full bg-ink" />}</span>
              <span><b className="block font-semibold">{s.label}</b><span className="text-[13px] text-muted">{s.note}</span></span>
            </button>
          )
        })}
      </div>
      <button className="btn mt-3 w-full" onClick={() => pick('live')}><Icon name="sync" />Reset the demo</button>
    </section>
  )
}
