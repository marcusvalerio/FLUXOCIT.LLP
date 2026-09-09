/**
 * Base URL of the FluxoCit Worker API — see .env.example. Empty when `VITE_API_BASE_URL` is not
 * set, which is the normal case for the current local-only version: the app never talks to a
 * backend, so there is deliberately NO implicit fallback (a hardcoded `http://localhost:8787`
 * default would turn every accidental call into a "Failed to fetch"/CORS error in production).
 * Pointing at a Worker is an explicit opt-in via the env var — see docs/DEPLOYMENT.md.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? ''

/** True only when a Worker API base URL was explicitly configured. Anything that would hit the
 * network (RemoteLayoutRepository, features/auth) must check this first — see apiFetch. */
export function isRemoteApiConfigured(): boolean {
  return API_BASE_URL !== ''
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** True for a fetch-level failure (offline, DNS, CORS, timeout) — as opposed to an ApiError,
 * which means the server was reached but responded with an error status. Callers use this to
 * distinguish "couldn't reach the server" from "server rejected the request" in error messages. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError
}

/**
 * Thin fetch wrapper for the Worker API: JSON in/out, session cookie always included, and a
 * typed ApiError for non-2xx responses so callers can branch on `.status` (e.g. 401 -> redirect
 * to login) without re-parsing the response body themselves.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // No backend configured (the default): fail fast and locally instead of firing a request at a
  // guessed host. Callers already handle ApiError, so this surfaces as a normal error message.
  if (!isRemoteApiConfigured()) {
    throw new ApiError(0, 'Nenhuma API remota configurada nesta instalação (VITE_API_BASE_URL).')
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })

  if (res.status === 204) return undefined as T

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // No/invalid JSON body — fine for e.g. a network gateway error page.
  }

  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? `Erro ${res.status} ao comunicar com o servidor.`
    throw new ApiError(res.status, message)
  }

  return body as T
}
