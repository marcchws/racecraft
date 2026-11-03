// "Bend" scenes: every illustration is the symbol's track bend on a ground line, and one marker on the lanes
// tells the state. Red appears only where the runner finished something (the tape).
const INK = 'var(--color-ink)', FAINT = 'var(--color-line-strong)', RED = 'var(--color-red)'
const RADII = [70, 56, 42]

const Lanes = ({ stroke, dash }: { stroke: string; dash?: string }) => (
  <>{RADII.map((r) => <path key={r} d={`M${100 - r} 112A${r} ${r} 0 0 1 ${100 + r} 112`} fill="none" stroke={stroke} strokeWidth={3} strokeDasharray={dash} />)}</>
)
const Ground = () => <path d="M14 112h172" stroke={INK} strokeWidth={2} strokeLinecap="round" />
const at = (r: number, deg: number) => [100 + r * Math.cos((deg * Math.PI) / 180), 112 - r * Math.sin((deg * Math.PI) / 180)].map((v) => v.toFixed(1)).join(' ')

const SCENES = {
  // Lanes only sketched and a starting block at the line: nothing set up yet.
  start: () => (
    <>
      <Lanes stroke={FAINT} dash="5 6" /><Ground />
      <path d="M38 112v-9l9 4v5" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M48 112v-6l7 3v3" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
    </>
  ),
  // Empty lanes under a moon: rest.
  rest: () => (
    <>
      <Lanes stroke={FAINT} /><Ground />
      <path d="M158 30a11 11 0 0 1-13.5-13.5 11 11 0 1 0 13.5 13.5z" fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
    </>
  ),
  // Tape at the top of the bend: done.
  finish: () => (
    <>
      <Lanes stroke={INK} /><Ground />
      <path d="M100 36v34" stroke={RED} strokeWidth={4} strokeLinecap="round" />
      <path d="M100 36l12 4-12 4" fill={RED} />
    </>
  ),
  // A gap in every lane: something failed to load or sync.
  broken: () => (
    <>
      {RADII.map((r) => (
        <g key={r}>
          <path d={`M${100 - r} 112A${r} ${r} 0 0 1 ${at(r, 102)}`} fill="none" stroke={INK} strokeWidth={3} />
          <path d={`M${at(r, 78)}A${r} ${r} 0 0 1 ${100 + r} 112`} fill="none" stroke={INK} strokeWidth={3} />
        </g>
      ))}
      <Ground />
    </>
  ),
  // A stopwatch at zero on the lanes: no runs yet.
  zero: () => (
    <>
      <Lanes stroke={FAINT} /><Ground />
      <circle cx="100" cy="74" r="20" fill="var(--color-chalk)" stroke={INK} strokeWidth={2.4} />
      <path d="M100 50v-4M95 46h10M100 74v-11" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
}
export type SceneName = keyof typeof SCENES

export function Bend({ name, width = 220 }: { name: SceneName; width?: number }) {
  const Scene = SCENES[name]
  return (
    <svg width={width} height={width * 0.6} viewBox="0 0 200 120" aria-hidden className="max-w-full">
      <Scene />
    </svg>
  )
}

/** The symbol: two lanes of a track bend, chalk on a track-red tile. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <rect width="40" height="40" rx="8" fill="#C93C24" />
      <path d="M9 31V20a11 11 0 0 1 22 0v11" fill="none" stroke="#FAF8F4" strokeWidth={3} />
      <path d="M15 31V20a5 5 0 0 1 10 0v11" fill="none" stroke="#FAF8F4" strokeWidth={3} />
    </svg>
  )
}
