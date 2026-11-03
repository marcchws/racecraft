import { useState } from 'react'
import { useFeel, useMove, useSend, useSkip } from '@/api/queries'
import { backToBack, freeDays } from '@/domain/adjust'
import { dayName, fmtDay, weekday } from '@/domain/dates'
import { aboutMinutes, fmtDuration, fmtPace } from '@/domain/pace'
import type { Feel, Now, Run, SessionKind, Step, Week, Workout } from '@/domain/types'
import { durationOf, isHard } from '@/domain/workouts'
import { Icon, type IconName } from '@/ui/Icon'
import { Menu, MenuItem, Sheet } from '@/ui/overlay'
import { useToast } from '@/ui/toast'

export const KIND_LABEL: Record<SessionKind, string> = { easy: 'Easy', tempo: 'Tempo', intervals: 'Intervals', long: 'Long run', race: 'Race', rest: 'Rest' }
export const kindIcon = (k: SessionKind): IconName => k

/** "10.2 km · about 61 min · reps at 5:05/km" */
export function metaOf(w: Workout, withPace = true) {
  const hard = w.blocks.find((b) => b.kind === 'rep')
  const pace = w.kind === 'intervals' ? `reps at ${fmtPace(hard!.pace)}/km` : w.kind === 'tempo' || w.kind === 'race' ? `${fmtPace(hard!.pace)}/km` : `${fmtPace(w.blocks[0]?.pace ?? 0)}/km`
  return [`${w.km.toFixed(1)} km`, `about ${aboutMinutes(durationOf(w))} min`, withPace ? pace : null].filter(Boolean).join(' · ')
}

export function Steps({ steps, onInk = false }: { steps: Step[]; onInk?: boolean }) {
  return (
    <ol className="mt-3.5 grid">
      {steps.map((s, i) => (
        <li key={i} className={`grid grid-cols-[28px_1fr_auto] items-center gap-3 border-t py-[11px] ${onInk ? 'border-hero-line' : 'border-line'}`}>
          <span className={`grid size-7 place-items-center rounded-full text-[13px] font-semibold ${s.hard ? 'bg-red text-white' : onInk ? 'bg-hero-num text-white' : 'bg-soft text-ink'}`}>{i + 1}</span>
          <div className="min-w-0"><b className="block font-semibold">{s.title}</b><span className={`text-[13px] ${onInk ? 'text-hero-muted' : 'text-muted'}`}>{s.detail}</span></div>
          <div className="text-right text-[16px] font-semibold">
            {fmtPace(s.pace)}
            <small className={`block text-[12px] font-medium ${onInk ? 'text-hero-muted' : 'text-muted'}`}>/km · {s.range ? `${fmtPace(s.range[0])}–${fmtPace(s.range[1])}` : s.note}</small>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function Why({ text, movedFrom }: { text: string; movedFrom?: Workout['movedFrom'] }) {
  return (
    <div>
      <span className="tag">Why today</span>
      <p className="mt-1.5">{movedFrom ? `Moved from week ${movedFrom.week}, where it was missed. ` : ''}{text}</p>
    </div>
  )
}

const FEELS: Feel[] = ['Easy', 'Fine', 'Hard', 'Very hard', 'Max']

/** The synced result and the one question Racecraft asks after a run. */
export function DoneResult({ run, workout, onInk = false }: { run: Run; workout: Workout; onInk?: boolean }) {
  const feel = useFeel()
  const toast = useToast()
  const target = workout.blocks.find((b) => b.kind === 'rep')
  const third = run.repPace && target
    ? { v: fmtPace(run.repPace), l: `avg ${workout.kind === 'intervals' ? 'rep' : 'pace'} · target ${fmtPace(target.pace)}` }
    : { v: fmtPace(run.pace), l: 'avg pace /km' }
  const choose = (f: Feel) => {
    const prev = run.feel ?? null
    if (prev === f) return
    feel.mutate({ runId: run.id, feel: f }, {
      onSuccess: () => toast({
        message: `Saved: ${f}. ${workout.kind === 'intervals' ? "Next week's reps take it into account." : 'The next weeks take it into account.'}`,
        undo: () => feel.mutate({ runId: run.id, feel: prev }),
      }),
      onError: () => toast({ message: "Couldn't save how it felt. Try again." }),
    })
  }
  const groupId = `feel-${run.id}`
  return (
    <div>
      <div className="mt-4 flex items-center gap-2 font-semibold">
        <Icon name="check" size={18} className={onInk ? 'text-good-on-ink' : 'text-good'} />
        Done · synced from your watch at {run.syncedAt}
      </div>
      <div className="mt-3 mb-3.5 grid grid-cols-3 gap-2">
        {[{ v: run.km.toFixed(1), l: 'km' }, { v: fmtDuration(run.seconds), l: 'time' }, third].map((s) => (
          <div key={s.l}><b className="block text-[22px] leading-[1.1] font-semibold">{s.v}</b><span className={`text-[12px] ${onInk ? 'text-hero-muted' : 'text-muted'}`}>{s.l}</span></div>
        ))}
      </div>
      <div className="text-[14px] font-semibold" id={groupId}>How did it feel?</div>
      <div className="mt-2 grid grid-cols-5 gap-1.5" role="group" aria-labelledby={groupId}>
        {FEELS.map((f) => {
          const on = (feel.isPending ? feel.variables?.feel : run.feel) === f
          return (
            <button
              key={f} aria-pressed={on} aria-label={f} onClick={() => choose(f)}
              className={`h-11 rounded-[6px] border text-[14px] font-semibold ${on ? 'border-red bg-red text-white' : onInk ? 'border-hero-edge hover:bg-white/5' : 'border-line-strong hover:bg-ink/[.04]'}`}
            >
              {f === 'Very hard' ? 'Very' : f}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Send to watch: busy, then "On your watch" with Undo; a failure puts it back and says why. */
export function SendButton({ workout, className = '' }: { workout: Workout; className?: string }) {
  const send = useSend()
  const toast = useToast()
  const sent = workout.sentToWatch && !send.isPending
  const busy = send.isPending && !send.variables?.undo
  const go = () => {
    if (busy) return
    if (sent) return
    send.mutate({ id: workout.id }, {
      onSuccess: () => toast({ message: `${workout.title} is on your watch.`, undo: () => send.mutate({ id: workout.id, undo: true }) }),
      onError: () => toast({ message: "Couldn't reach your watch. Try again in a minute." }),
    })
  }
  return (
    <button className={`btn ${sent ? '' : 'btn-primary'} ${className}`} aria-busy={busy || undefined} onClick={go} aria-live="polite">
      {busy ? <><span className="spin" aria-hidden />Sending…</> : sent ? <><Icon name="check" />On your watch</> : <><Icon name="watch" />Send to watch</>}
    </button>
  )
}

/** The "more" button: Skip and Move to…, each with its own confirm. */
export function MoreMenu({ workout, week, now, onInk = false }: { workout: Workout; week: Week; now: Now; onInk?: boolean }) {
  const [dialog, setDialog] = useState<'skip' | 'move' | null>(null)
  // Only the trigger hides once the workout is skipped or past: the dialogs stay mounted so their mutation can
  // still show its toast and Undo after the optimistic update lands.
  const actionable = workout.kind !== 'rest' && workout.kind !== 'race' && workout.status === 'planned' && workout.date >= now.date
  return (
    <>
      {actionable && <Menu label="Workout actions" trigger={
        <button className={`icon-btn -my-2 -mr-2 ${onInk ? 'text-white' : ''}`} aria-label={`More: skip or move ${workout.title}`}><Icon name="more" /></button>
      }>
        <MenuItem icon="skip" onSelect={() => setDialog('skip')}>Skip this run</MenuItem>
        <MenuItem icon="adjust" onSelect={() => setDialog('move')}>Move to…</MenuItem>
      </Menu>}
      <SkipDialog workout={workout} open={dialog === 'skip'} onOpenChange={(o) => setDialog(o ? 'skip' : null)} />
      <MoveDialog workout={workout} week={week} now={now} open={dialog === 'move'} onOpenChange={(o) => setDialog(o ? 'move' : null)} />
    </>
  )
}

export function SkipDialog({ workout, open, onOpenChange }: { workout: Workout; open: boolean; onOpenChange: (o: boolean) => void }) {
  const skip = useSkip()
  const toast = useToast()
  const confirm = () => {
    skip.mutate({ id: workout.id }, {
      onSuccess: ({ adjustment }) => {
        onOpenChange(false)
        toast({ message: adjustment ? `Skipped. ${adjustment.message.replace(/^You skipped [^.]+\. /, '')}` : `${workout.title} skipped. Easy runs aren't made up; the week goes on.`, undo: () => skip.mutate({ id: workout.id, undo: true }) })
      },
      onError: () => toast({ message: "Couldn't skip it. Your plan didn't change." }),
    })
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} tag={`${fmtDay(workout.date)} · ${KIND_LABEL[workout.kind]}`} title={`Skip ${workout.title}?`}>
      <p className="mt-3">
        {isHard(workout)
          ? `The ${workout.kind === 'intervals' ? 'reps move' : 'tempo moves'} into next week and take the place of an easy run. The long run stays.`
          : 'An easy run is not made up. The rest of the week stays as it is.'}
      </p>
      <div className="mt-5 grid gap-2 desk:grid-cols-[auto_auto] desk:justify-end">
        <button className="btn" onClick={() => onOpenChange(false)}>Keep it</button>
        <button className="btn btn-primary" onClick={confirm} aria-busy={skip.isPending || undefined}>
          {skip.isPending ? <><span className="spin" aria-hidden />Skipping…</> : <><Icon name="skip" />Skip this run</>}
        </button>
      </div>
    </Sheet>
  )
}

export function MoveDialog({ workout, week, now, open, onOpenChange }: { workout: Workout; week: Week; now: Now; open: boolean; onOpenChange: (o: boolean) => void }) {
  const move = useMove()
  const toast = useToast()
  const free = freeDays(week, now)
  const [to, setTo] = useState<string | null>(null)
  const warning = to ? backToBack(week, workout, to, now) : null
  const confirm = () => {
    if (!to) return
    const from = workout.date
    move.mutate({ id: workout.id, to, from }, {
      onSuccess: () => {
        onOpenChange(false)
        setTo(null)
        toast({ message: `${workout.title} moved to ${fmtDay(to)}.`, undo: () => move.mutate({ id: workout.id, to: from, from: to }) })
      },
      onError: () => toast({ message: "Couldn't move it. Your plan didn't change." }),
    })
  }
  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTo(null) }} tag={`Week ${week.n} · now ${fmtDay(workout.date)}`} title={`Move ${workout.title}`}
      description="Pick one of this week's free days.">
      {free.length ? (
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Free days">
          {free.map((d) => {
            const on = to === d.date
            return (
              <button key={d.id} role="radio" aria-checked={on} onClick={() => setTo(d.date)}
                className={`flex h-14 items-center justify-between rounded-[10px] border px-4 text-left ${on ? 'border-ink bg-card shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line-strong bg-card hover:border-ink'}`}>
                <span><b className="font-semibold">{dayName(weekday(d.date))}</b> <span className="muted">{fmtDay(d.date).slice(4)}</span></span>
                <span className={`grid size-5 place-items-center rounded-full border-2 ${on ? 'border-ink' : 'border-line-strong'}`}>{on && <i className="size-2.5 rounded-full bg-ink" />}</span>
              </button>
            )
          })}
        </div>
      ) : <p className="mt-4">No free days left this week. Skip it instead, or keep it where it is.</p>}
      {warning && (
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2.5 rounded-[12px] bg-red-soft px-3.5 py-3 text-[14px] text-red-deep" role="status">
          <Icon name="alert" /><div><b className="block font-semibold">Two hard days in a row</b>{warning}</div>
        </div>
      )}
      <div className="mt-5 grid gap-2 desk:grid-cols-[auto_auto] desk:justify-end">
        <button className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
        <button className={`btn ${to ? 'btn-primary' : 'text-muted'}`} disabled={!to} onClick={confirm} aria-busy={move.isPending || undefined}>
          {move.isPending ? <><span className="spin" aria-hidden />Moving…</> : to ? `Move to ${dayName(weekday(to))}` : 'Move'}
        </button>
      </div>
    </Sheet>
  )
}

/** Shapes and lines for a non-today workout at a glance: glyph tile, red-tinted for hard sessions. */
export function KindTile({ kind, size = 32 }: { kind: SessionKind; size?: number }) {
  const hard = kind === 'intervals' || kind === 'tempo' || kind === 'race'
  return (
    <span className={`grid shrink-0 place-items-center rounded-[8px] ${hard ? 'bg-red-soft' : 'bg-soft'}`} style={{ width: size, height: size }}>
      <Icon name={kindIcon(kind)} size={size >= 40 ? 20 : 18} />
    </span>
  )
}
