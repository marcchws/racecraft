import { useCallback, type ReactNode } from 'react'
import { band, linear, ticks } from './scale'
import { useSelection, useWidth } from './useChart'

export interface BarItem {
  key: string
  label: string
  planned: number | null
  done: number | null
  current?: boolean
  future?: boolean
  /** Short label drawn above the bar: "Recovery", "Peak", "Taper". */
  mark?: string
}

const PAD_R = 34, PAD_T = 8, PAD_B = 20

/**
 * Weekly kilometres: planned as an outline (dashed in the future), done as an ink fill, this week outlined in
 * red. Hover, tap or the arrow keys select a week; the readout under it says what that week was.
 */
export function WeekBars({ items, height = 120, initial = null, label, readout, animate = false, marks = false }: {
  items: BarItem[]
  height?: number
  initial?: number | null
  label: string
  readout: (item: BarItem, index: number) => ReactNode
  animate?: boolean
  marks?: boolean
}) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const top = PAD_T + (marks ? 16 : 0)
  const max = Math.max(10, ...items.map((i) => Math.max(i.planned ?? 0, i.done ?? 0)))
  const step = max > 24 ? 20 : 10
  // A little air over the tallest bar, not a whole gridline step: the bars keep their height.
  const yMax = max * 1.05
  const x = band(items.length, [0, W - PAD_R])
  const y = linear([0, yMax], [height - PAD_B, top])
  const bw = Math.min(26, x.slot * 0.58)
  // Under 44 px a slot has no room for "Taper": the marks shrink to their initial and a key explains them.
  const compact = x.slot < 44
  const keyMarks = marks && compact ? [...new Set(items.flatMap((i) => (i.mark ? [i.mark] : [])))] : []
  const indexAt = useCallback((px: number) => x.at(px), [x])
  const { selected, props } = useSelection(items.length, indexAt, { initial })
  const sel = selected != null ? items[selected] : undefined

  return (
    <div>
      <div ref={ref} {...props} role="group" aria-label={`${label} Left and right arrows read each week.`} className="mt-3.5 mb-1 touch-pan-y rounded-[6px]">
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} className="block" aria-hidden>
          {selected != null && <rect x={selected * x.slot} y={0} width={x.slot} height={height - PAD_B + 2} rx={4} fill="var(--color-soft)" />}
          {ticks([0, yMax], step).filter((t) => t > 0).map((t) => (
            <g key={t}>
              <line x1={0} x2={W - PAD_R + 4} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
              <text x={W} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--color-muted)">{t} km</text>
            </g>
          ))}
          <g key={animate ? items.map((i) => i.key).join() : 'static'}>
            {items.map((it, i) => {
              const cx = x.center(i), bx = cx - bw / 2
              return (
                <g key={it.key}>
                  {it.planned != null && (
                    <rect
                      x={bx} y={y(it.planned)} width={bw} height={y(0) - y(it.planned)} rx={3} fill="none"
                      stroke={it.current ? 'var(--color-red)' : 'var(--color-line-strong)'} strokeWidth={it.current ? 2 : 1.5}
                      strokeDasharray={it.future ? '3 3' : undefined}
                    />
                  )}
                  {!!it.done && (
                    <rect
                      x={bx} y={y(it.done)} width={bw} height={y(0) - y(it.done)} rx={3} fill="var(--color-ink)"
                      className={animate ? 'grow' : undefined} style={animate ? { animationDelay: `${i * 25}ms` } : undefined}
                    />
                  )}
                  {marks && it.mark && it.planned != null && (
                    <text x={cx} y={y(it.planned) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--color-muted)">{compact ? it.mark[0] : it.mark}</text>
                  )}
                  <text x={cx} y={height - 4} textAnchor="middle" fontSize={12} fontWeight={it.current ? 700 : 500} fill={it.current ? 'var(--color-red)' : 'var(--color-muted)'}>{it.label}</text>
                </g>
              )
            })}
          </g>
          <line x1={0} x2={W - PAD_R + 4} y1={y(0)} y2={y(0)} stroke="var(--color-line-strong)" />
        </svg>
      </div>
      {keyMarks.length > 0 && <p className="mb-1 text-[12px] text-muted" aria-hidden>{keyMarks.map((m) => `${m[0]} ${m.toLowerCase()}`).join(' · ')}</p>}
      <p className="min-h-[19px] text-[13px] text-muted" aria-live="polite">{sel ? readout(sel, selected!) : 'Hover, tap or use the arrow keys to read a week.'}</p>
    </div>
  )
}
