// Every pace is seconds per km and every duration is seconds, so the maths stays in integers until it is shown.

/** Offsets from goal pace, seconds per km: how each session's target is explained. */
export const PACE_OFFSET = { rep: -13, tempo: 2, easy: 72, jog: 102 } as const

export const pacesFromGoal = (goalPace: number) => ({
  rep: goalPace + PACE_OFFSET.rep,
  tempo: goalPace + PACE_OFFSET.tempo,
  easy: goalPace + PACE_OFFSET.easy,
  jog: goalPace + PACE_OFFSET.jog,
})

/** 305 → "5:05" */
export const fmtPace = (secPerKm: number) => {
  const s = Math.round(secPerKm)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** 3612 → "1:00:12", 244 → "4:04" */
export const fmtDuration = (seconds: number) => {
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

/** "1:52:00" or "52:00" → seconds; null when it is not a time. */
export const parseDuration = (text: string): number | null => {
  const m = text.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const [h, mm, ss] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])]
  if (ss > 59 || (m[1] !== undefined && mm > 59)) return null
  return h * 3600 + mm * 60 + ss
}

/** A whole-minute estimate for "about 61 min". */
export const aboutMinutes = (seconds: number) => Math.round(seconds / 60)

export const paceOf = (km: number, seconds: number) => seconds / km

/**
 * Riegel's endurance model, T2 = T1 × (D2 / D1)^1.06: the usual way to carry a race time to another distance
 * (Riegel, "Athletic records and human endurance", American Scientist, 1981).
 */
export const riegel = (seconds: number, fromKm: number, toKm: number) => seconds * (toKm / fromKm) ** 1.06

/**
 * A starting estimate from weekly km alone, for runners with no recent race: a half-marathon pace that improves
 * by 4 s/km for every extra 5 km a week, from 6:20/km at 10 km a week, and never under 4:45/km. It is a coarse
 * guess and the plan says so.
 */
export const halfPaceFromWeeklyKm = (weeklyKm: number) => Math.max(285, 380 - ((weeklyKm - 10) / 5) * 4)

export const RACE_KM = { '5K': 5, '10K': 10, Half: 21.0975 } as const
