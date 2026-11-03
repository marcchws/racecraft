import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { Adjustment, Feel, Race, Run, WatchConnection, Weekday, Workout } from '@/domain/types'
import { api, isNoPlan } from './client'
import type { MeResponse, NewPlanRequest, PlanResponse, ProgressResponse, Range, TodayResponse, WeekView, WorkoutResponse } from './types'

export const keys = {
  today: ['today'] as const,
  plan: ['plan'] as const,
  week: (n: number) => ['plan', 'week', n] as const,
  workout: (id: string) => ['workout', id] as const,
  progress: (range: Range) => ['progress', range] as const,
  races: ['races'] as const,
  me: ['me'] as const,
  watch: ['watch'] as const,
}

// "No plan yet" is an answer, not a failure: it is not retried.
const retry = (count: number, e: unknown) => !isNoPlan(e) && count < 1

export const useToday = () => useQuery({ queryKey: keys.today, queryFn: () => api<TodayResponse>('/api/today'), retry })
export const usePlan = () => useQuery({ queryKey: keys.plan, queryFn: () => api<PlanResponse>('/api/plan'), retry })
export const useWeek = (n: number | null) =>
  useQuery({ queryKey: keys.week(n ?? 0), queryFn: () => api<WeekView>(`/api/plan/weeks/${n}`), enabled: n != null, retry })
export const useWorkout = (id: string) => useQuery({ queryKey: keys.workout(id), queryFn: () => api<WorkoutResponse>(`/api/workouts/${id}`), retry })
export const useProgress = (range: Range) =>
  useQuery({ queryKey: keys.progress(range), queryFn: () => api<ProgressResponse>(`/api/progress?range=${range}`), retry, placeholderData: (prev) => prev })
export const useRaces = () => useQuery({ queryKey: keys.races, queryFn: () => api<Race[]>('/api/races') })
export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api<MeResponse>('/api/me') })

/** Every view that shows a workout, so one change refreshes all of them. */
const refreshAll = (qc: QueryClient) => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'races' })

/** Patches a workout wherever the cache holds it, for optimistic updates. */
function patchWorkout(qc: QueryClient, id: string, patch: (w: Workout) => Workout) {
  const fix = (w: Workout) => (w.id === id ? patch(w) : w)
  qc.setQueryData<TodayResponse>(keys.today, (d) => d && { ...d, today: fix(d.today), week: { ...d.week, days: d.week.days.map(fix) } })
  qc.setQueriesData<WeekView>({ queryKey: ['plan', 'week'] }, (d) => d && { ...d, days: d.days.map(fix) })
  qc.setQueryData<WorkoutResponse>(keys.workout(id), (d) => d && { ...d, workout: fix(d.workout) })
}
/** Snapshots what an optimistic update touches, to roll it back on failure. */
async function snapshot(qc: QueryClient) {
  await qc.cancelQueries()
  return qc.getQueriesData({ predicate: () => true })
}
const restore = (qc: QueryClient, snap: Awaited<ReturnType<typeof snapshot>> | undefined) => snap?.forEach(([k, v]) => qc.setQueryData(k, v))

export function useSend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, undo }: { id: string; undo?: boolean }) => api<Workout>(`/api/workouts/${id}/send`, { method: 'POST', body: { undo } }),
    onMutate: async ({ id, undo }) => {
      const snap = await snapshot(qc)
      patchWorkout(qc, id, (w) => ({ ...w, sentToWatch: !undo }))
      return snap
    },
    onError: (_e, _v, snap) => restore(qc, snap),
  })
}

export function useSkip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, undo }: { id: string; undo?: boolean }) =>
      api<{ adjustment: Adjustment | null }>(`/api/workouts/${id}/skip`, { method: 'POST', body: { undo } }),
    onMutate: async ({ id, undo }) => {
      const snap = await snapshot(qc)
      patchWorkout(qc, id, (w) => ({ ...w, status: undo ? 'planned' : 'skipped' }))
      return snap
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSettled: () => refreshAll(qc),
  })
}

export function useMove() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string; from: string }) => api<Workout>(`/api/workouts/${id}/move`, { method: 'POST', body: { to } }),
    onMutate: async ({ id, to }) => {
      const snap = await snapshot(qc)
      patchWorkout(qc, id, (w) => ({ ...w, date: to }))
      return snap
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSettled: () => refreshAll(qc),
  })
}

export function useFeel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ runId, feel }: { runId: string; feel: Feel | null }) => api<Run>(`/api/runs/${runId}/feel`, { method: 'POST', body: { feel } }),
    onMutate: async ({ runId, feel }) => {
      const snap = await snapshot(qc)
      const fix = (r: Run | null) => (r && r.id === runId ? { ...r, feel: feel ?? undefined } : r)
      qc.setQueryData<TodayResponse>(keys.today, (d) => d && { ...d, run: fix(d.run) })
      qc.setQueriesData<WorkoutResponse>({ queryKey: ['workout'] }, (d) => d && { ...d, run: fix(d.run) })
      return snap
    },
    onError: (_e, _v, snap) => restore(qc, snap),
    onSettled: () => qc.invalidateQueries({ queryKey: ['progress'] }),
  })
}

export function useBuildPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: NewPlanRequest) => api<{ id: string }>('/api/plans', { method: 'POST', body: req }),
    onSuccess: () => qc.resetQueries({ predicate: (q) => q.queryKey[0] !== 'races' }),
  })
}

export function useSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: { runDays: Weekday[]; longDay: Weekday }) => api<{ from: number; to: number }>('/api/plan', { method: 'PATCH', body: s }),
    onSettled: () => refreshAll(qc),
  })
}

export function useSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<{ watch: WatchConnection; newRuns: number }>('/api/watch/sync', { method: 'POST' }),
    onSuccess: () => refreshAll(qc),
  })
}

export function useConnectWatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<WatchConnection>('/api/watch/connect', { method: 'POST' }),
    onSuccess: () => refreshAll(qc),
  })
}
