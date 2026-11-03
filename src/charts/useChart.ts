import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { stepIndex } from './scale'

/** The width an SVG gets from its box, so charts draw at real pixels and their text never scales. */
export function useWidth<T extends Element>(fallback = 340) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.round(e.contentRect.width) || fallback))
    ro.observe(el)
    return () => ro.disconnect()
  }, [fallback])
  return [ref, width] as const
}

/**
 * One selection per chart, shared by mouse hover, touch, and the arrow keys; Escape clears it when `clearable`.
 * `indexAt` maps a pointer's x inside the chart to an item.
 */
export function useSelection(n: number, indexAt: (x: number) => number, opts: { initial?: number | null; clearable?: boolean } = {}) {
  const [selected, setSelected] = useState<number | null>(opts.initial ?? null)
  const resting = opts.initial ?? null
  const fromPointer = useCallback((e: PointerEvent<Element>) => {
    const box = e.currentTarget.getBoundingClientRect()
    setSelected(indexAt(e.clientX - box.left))
  }, [indexAt])
  return {
    selected,
    setSelected,
    props: {
      tabIndex: 0,
      onPointerMove: (e: PointerEvent<Element>) => { if (e.pointerType === 'mouse') fromPointer(e) },
      onPointerDown: fromPointer,
      onPointerLeave: (e: PointerEvent<Element>) => {
        if (e.pointerType === 'mouse' && opts.clearable && document.activeElement !== e.currentTarget) setSelected(resting)
      },
      onKeyDown: (e: KeyboardEvent<Element>) => {
        const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
        if (delta) { e.preventDefault(); setSelected((s) => stepIndex(s, delta, n)) }
        else if (e.key === 'Home') { e.preventDefault(); setSelected(0) }
        else if (e.key === 'End') { e.preventDefault(); setSelected(n - 1) }
        else if (e.key === 'Escape' && opts.clearable) { e.preventDefault(); setSelected(resting) }
      },
    },
  }
}
