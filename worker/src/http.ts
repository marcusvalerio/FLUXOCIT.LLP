import type { Context } from 'hono'

/** Parses the request JSON body, tolerating an empty/invalid body (returns `{}` cast to T so
 * every field reads as `undefined` and callers validate explicitly) instead of throwing. */
export async function readJsonBody<T extends object>(c: Context): Promise<T> {
  return (await c.req.json().catch(() => ({}))) as T
}

/**
 * Texto vindo do cliente, tratado como texto. O corpo é JSON arbitrário: um campo declarado como
 * string pode chegar como número, objeto ou nulo, e chamar `.trim()` nele derrubaria o handler
 * com 500 — erro de servidor para o que é, na verdade, entrada inválida do cliente.
 */
export function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

/** Número finito vindo do cliente; qualquer outra coisa vira `undefined`. */
export function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Lista vinda do cliente; qualquer outra coisa é entrada inválida (400, nunca 500). */
export function isArrayBody(value: unknown): value is unknown[] {
  return Array.isArray(value)
}
