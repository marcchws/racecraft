import type { Weekday } from './types'

// Dates are wall-clock days in São Paulo kept as YYYY-MM-DD, and all arithmetic runs in UTC so no time zone
// or daylight-saving rule can shift a day.
const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d)
}
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const DAY = 86_400_000

export const addDays = (iso: string, n: number) => fromUtc(toUtc(iso) + n * DAY)
export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / DAY)
export const weekday = (iso: string) => ((new Date(toUtc(iso)).getUTCDay() + 6) % 7) as Weekday
export const mondayOf = (iso: string) => addDays(iso, -weekday(iso))

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

export const dayName = (d: Weekday) => DAYS[d]
export const dayShort = (d: Weekday) => DAYS[d].slice(0, 3)
const parts = (iso: string) => {
  const dt = new Date(toUtc(iso))
  return { d: dt.getUTCDate(), m: dt.getUTCMonth(), y: dt.getUTCFullYear(), wd: weekday(iso) }
}
/** "Tue 3 Nov" */
export const fmtDay = (iso: string) => {
  const p = parts(iso)
  return `${dayShort(p.wd)} ${p.d} ${MONTHS[p.m]}`
}
/** "Tuesday 3 November" */
export const fmtDayLong = (iso: string) => {
  const p = parts(iso)
  return `${dayName(p.wd)} ${p.d} ${MONTHS_LONG[p.m]}`
}
/** "3 Nov" */
export const fmtDate = (iso: string) => {
  const p = parts(iso)
  return `${p.d} ${MONTHS[p.m]}`
}
/** "13 Dec 2026" */
export const fmtDateYear = (iso: string) => `${fmtDate(iso)} ${parts(iso).y}`
export const dateOfMonth = (iso: string) => parts(iso).d
