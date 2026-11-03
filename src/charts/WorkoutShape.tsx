import { useCallback, useMemo } from 'react'
import { fmtDuration, fmtPace } from '@/domain/pace'
import type { Block } from '@/domain/types'
import { useSelection, useWidth } from './useChart'

const GAP = 2
const km1 = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`)

/**
 * The workout shape, Racecraft's signature graphic: one bar per block, its width the block's time and its height
 * the effort. Easy is ink (white on ink), reps and other hard blocks are track red, jogs the light line colour.
 */
export function WorkoutShape({ blocks, summary, height = 64, onInk = false, keys = true }: {
  blocks: Block[]
  summary: string
  height?: number
  onInk?: boolean
  keys?: boolean
}) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const geometry = useMemo(() => {
    const total = blocks.reduce((t, b) => t + b.seconds, 0) || 1
    const usable = W - GAP * (blocks.length - 1)
    let x = 0
    return blocks.map((b) => {
      const w = (usable * b.seconds) / total
      const g = { x, w, h: Math.max(6, (height - 4) * b.effort) }
      x += w + GAP
      return g
    })
  }, [blocks, W, height])
  const indexAt = useCallback((px: number) => {
    const i = geometry.findIndex((g) => px >= g.x && px < g.x + g.w + GAP)
    return i < 0 ? (px < 0 ? 0 : blocks.length - 1) : i
  }, [geometry, blocks.length])
  const { selected, props } = useSelection(blocks.length, indexAt, { clearable: true })
  const fill = { easy: onInk ? '#FFFFFF' : 'var(--color-ink)', rep: 'var(--color-red)', jog: onInk ? 'var(--color-hero-edge)' : 'var(--color-line-strong)' }
  const b = selected != null ? blocks[selected] : undefined
  const rep = blocks.find((x) => x.kind === 'rep'), easy = blocks.find((x) => x.kind === 'easy'), jog = blocks.find((x) => x.kind === 'jog')

  return (
    <div>
      <div
        ref={ref} {...props} role="group" aria-label="Workout shape. Left and right arrows read each block; Escape clears."
        className="mt-[18px] mb-1.5 touch-pan-y rounded-[6px]"
      >
        <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} className="block" aria-hidden>
          {geometry.map((g, i) => (
            <rect
              key={i} x={g.x.toFixed(1)} y={(height - g.h).toFixed(1)} width={Math.max(0.5, g.w).toFixed(1)} height={g.h.toFixed(1)} rx={2}
              fill={fill[blocks[i]!.kind]} opacity={selected != null && selected !== i ? 0.45 : 1}
              stroke={selected === i ? (onInk ? '#FFFFFF' : 'var(--color-ink)') : undefined} strokeWidth={selected === i ? 2 : undefined}
            />
          ))}
        </svg>
      </div>
      <p className={`min-h-[19px] text-[13px] ${onInk ? 'text-hero-muted' : 'text-muted'}`} aria-live="polite">
        {b ? <><b className={`font-semibold ${onInk ? 'text-white' : 'text-ink'}`}>{b.label}</b> · {km1(b.meters)} at {fmtPace(b.pace)}/km · {fmtDuration(b.seconds)}</> : summary}
      </p>
      {keys && (
        <div className={`mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[12px] ${onInk ? 'text-hero-muted' : 'text-muted'}`}>
          {easy && <Key color={fill.easy}>Easy {fmtPace(easy.pace)}</Key>}
          {rep && <Key color={fill.rep}>{rep.label.startsWith('Rep') ? 'Rep' : 'Hard'} {fmtPace(rep.pace)}</Key>}
          {jog && <Key color={fill.jog}>Jog {jog.meters} m</Key>}
        </div>
      )}
    </div>
  )
}

const Key = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-[2px]" style={{ background: color }} />{children}</span>
)
