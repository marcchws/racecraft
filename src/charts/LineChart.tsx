import { useCallback, useMemo, type ReactNode } from 'react'
import { band, linear, ticks } from './scale'
import { useSelection, useWidth } from './useChart'

export interface Point { key: string; label: string; value: number | null }

const PAD_L = 44, PAD_R = 12, PAD_T = 14, PAD_B = 22

/**
 * A line over weeks with an optional goal line. `invert` draws lower values higher, for pace and finish time,
 * where less is faster; the axis says so in `axisNote`.
 */
export function LineChart({ points, label, format, readout, goal, goalLabel, invert = false, step, height = 180, axisNote, initial = null }: {
  points: Point[]
  label: string
  format: (v: number) => string
  readout: (p: Point, i: number) => ReactNode
  goal?: number | null
  goalLabel?: string
  invert?: boolean
  step: number
  height?: number
  axisNote?: string
  initial?: number | null
}) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const values = points.flatMap((p) => (p.value == null ? [] : [p.value]))
  const all = goal != null ? [...values, goal] : values
  const lo = Math.floor((Math.min(...all) - step / 2) / step) * step, hi = Math.ceil((Math.max(...all) + step / 2) / step) * step
  const x = band(points.length, [PAD_L, W - PAD_R])
  const y = linear([lo, hi], invert ? [PAD_T, height - PAD_B] : [height - PAD_B, PAD_T])
  const indexAt = useCallback((px: number) => x.at(px), [x])
  const { selected, props } = useSelection(points.length, indexAt, { initial })
  const path = useMemo(() => {
    let d = '', len = 0, prev: [number, number] | null = null
    points.forEach((p, i) => {
      if (p.value == null) { prev = null; return }
      const pt: [number, number] = [x.center(i), y(p.value)]
      d += `${prev ? 'L' : 'M'}${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`
      if (prev) len += Math.hypot(pt[0] - prev[0], pt[1] - prev[1])
      prev = pt
    })
    return { d, len: Math.ceil(len) }
  }, [points, x, y])
  const sel = selected != null ? points[selected] : undefined
  const animKey = points.map((p) => `${p.key}${p.value}`).join()

  return (
    <div>
      <div ref={ref} {...props} role="group" aria-label={`${label} Left and right arrows read each week.`} className="mt-3 mb-1 touch-pan-y rounded-[6px]">
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} className="block" aria-hidden>
          {selected != null && <rect x={x.center(selected) - x.slot / 2} y={0} width={x.slot} height={height - PAD_B + 2} rx={4} fill="var(--color-soft)" />}
          {ticks([lo, hi], step).map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
              <text x={PAD_L - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--color-muted)">{format(t)}</text>
            </g>
          ))}
          {goal != null && (
            <g>
              {/* Muted and dashed, not red: red stays for effort and the one primary action. */}
              <line x1={PAD_L} x2={W - PAD_R} y1={y(goal)} y2={y(goal)} stroke="var(--color-muted)" strokeWidth={1.5} strokeDasharray="5 4" />
              <text x={W - PAD_R} y={y(goal) + (invert ? 16 : -6)} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--color-muted)">{goalLabel ?? 'Goal'} {format(goal)}</text>
            </g>
          )}
          <path key={animKey} d={path.d} fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="draw-line" style={{ ['--len' as string]: path.len }} />
          {points.map((p, i) => p.value != null && (
            <circle key={p.key} cx={x.center(i)} cy={y(p.value)} r={selected === i ? 5 : 3.5} fill={selected === i ? 'var(--color-ink)' : 'var(--color-card)'} stroke="var(--color-ink)" strokeWidth={2} />
          ))}
          {points.map((p, i) => (
            <text key={p.key} x={x.center(i)} y={height - 5} textAnchor="middle" fontSize={12} fontWeight={selected === i ? 700 : 500} fill={selected === i ? 'var(--color-ink)' : 'var(--color-muted)'}>{p.label}</text>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="min-h-[19px] text-[13px] text-muted" aria-live="polite">{sel ? readout(sel, selected!) : 'Hover, tap or use the arrow keys to read a week.'}</p>
        {axisNote && <p className="text-[12px] text-muted">{axisNote}</p>}
      </div>
    </div>
  )
}
