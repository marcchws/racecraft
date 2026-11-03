// Racecraft's icon set: a 20-unit grid, 1.6 stroke, round caps and joins, drawn in currentColor.
// New glyphs follow the same grid.
const P = {
  today: <><circle cx="10" cy="10" r="3.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" /></>,
  plan: <><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v4M13 2v4M6.5 11.5h2M11.5 11.5h2M6.5 14h2" /></>,
  progress: <path d="M3 16.5h14M5.5 13.5v-4M10 13.5v-9M14.5 13.5v-6" />,
  you: <><circle cx="10" cy="7" r="3.5" /><path d="M3.5 17a6.5 6.5 0 0 1 13 0" /></>,
  watch: <><rect x="5.5" y="5" width="9" height="10" rx="2.5" /><path d="M7.5 5V2.5h5V5M7.5 15v2.5h5V15M10 8v2.2l1.4 1" /></>,
  sync: <><path d="M4 10a6 6 0 0 1 10.5-4M16 10a6 6 0 0 1-10.5 4" /><path d="M14.5 2.5V6H11M5.5 17.5V14H9" /></>,
  adjust: <path d="M3.5 7h11l-3-3M16.5 13h-11l3 3" />,
  check: <path d="M4.5 10.5l3.5 3.5 7.5-8" />,
  skip: <path d="M4 5l7 5-7 5zM15 5v10" />,
  easy: <path d="M8 5l5 5-5 5" />,
  tempo: <path d="M5 5l5 5-5 5M10.5 5l5 5-5 5" />,
  intervals: <path d="M3.5 16v-5M7.5 16V5M11.5 16v-5M15.5 16V5" />,
  long: <path d="M2.5 10h14M12.5 6l4 4-4 4" />,
  race: <path d="M5 18V3M5 4h10l-2 3.5L15 11H5" />,
  rest: <path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z" />,
  clock: <><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></>,
  distance: <><circle cx="4" cy="15.5" r="1.5" /><circle cx="16" cy="4.5" r="1.5" /><path d="M5.3 14.5C9 12 7 8 10.5 7S14 5.5 14.7 5.3" /></>,
  pace: <path d="M3.5 14.5a7 7 0 1 1 13 0M10 14l3-4" />,
  feel: <><circle cx="10" cy="10" r="7" /><path d="M7 11.5a3.5 3.5 0 0 0 6 0M7.5 8h0M12.5 8h0" /></>,
  alert: <path d="M10 3l7.5 13.5h-15zM10 8.5v3.5M10 14.3h0" />,
  cloudOff: <path d="M6 15.5h8a3.5 3.5 0 0 0 .6-6.95A5 5 0 0 0 5.3 8 3.75 3.75 0 0 0 6 15.5zM3 3l14 14" />,
  more: <path d="M4.5 10h0M10 10h0M15.5 10h0" />,
  chevron: <path d="M8 5l5 5-5 5" />,
  back: <path d="M12 5l-5 5 5 5" />,
  close: <path d="M5 5l10 10M15 5L5 15" />,
  plus: <path d="M10 4v12M4 10h12" />,
  heart: <path d="M10 16.5S3 12.5 3 7.8A3.6 3.6 0 0 1 10 6a3.6 3.6 0 0 1 7 1.8c0 4.7-7 8.7-7 8.7z" />,
  // Added for the build, on the same grid: a missed session and a calendar grid.
  missed: <><circle cx="10" cy="10" r="7" /><path d="M7.5 7.5l5 5M12.5 7.5l-5 5" /></>,
  grid: <path d="M3 4h14v12H3zM3 8h14M3 12h14M7.7 4v12M12.3 4v12" />,
  demo: <path d="M7 3h6M8 3v5l-4.5 8a1 1 0 0 0 .9 1.5h11.2a1 1 0 0 0 .9-1.5L12 8V3M5.5 12.5h9" />,
} as const

export type IconName = keyof typeof P

export function Icon({ name, size = 20, className = '', label }: { name: IconName; size?: number; className?: string; label?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}
    >
      {P[name]}
    </svg>
  )
}

export const ICONS = Object.keys(P) as IconName[]
