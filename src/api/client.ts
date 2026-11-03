import type { ApiError } from './types'

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null
    throw new HttpError(res.status, err?.error ?? 'http', err?.message ?? `The request failed (${res.status}).`)
  }
  return (await res.json()) as T
}

export const isNoPlan = (e: unknown) => e instanceof HttpError && e.code === 'no-plan'
