/** Maps a value range onto a pixel range. Reversing the range draws a faster pace higher. */
export function linear([d0, d1]: [number, number], [r0, r1]: [number, number]) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  const map = (v: number) => r0 + (v - d0) * k
  map.invert = (px: number) => (k === 0 ? d0 : d0 + (px - r0) / k)
  return map
}

/** Evenly spaced slots for bars or points: the centre of slot i and the slot that holds a pixel. */
export function band(n: number, [r0, r1]: [number, number]) {
  const slot = n ? (r1 - r0) / n : 0
  return {
    slot,
    center: (i: number) => r0 + slot * (i + 0.5),
    at: (px: number) => Math.min(n - 1, Math.max(0, Math.floor((px - r0) / (slot || 1)))),
  }
}

/** Round bounds that hold every value with a little air, stepped to `step`. */
export function niceDomain(values: number[], step: number, pad = 0): [number, number] {
  const lo = Math.min(...values) - pad, hi = Math.max(...values) + pad
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step]
}

export function ticks([d0, d1]: [number, number], step: number) {
  const out: number[] = []
  for (let v = Math.ceil(d0 / step) * step; v <= d1 + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000)
  return out
}

/** Index of the next or previous point for arrow keys, clamped to the series. */
export const stepIndex = (current: number | null, delta: number, n: number) =>
  Math.min(n - 1, Math.max(0, (current ?? (delta > 0 ? -1 : n)) + delta))
