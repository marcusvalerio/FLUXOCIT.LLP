import { isRemoteApiConfigured } from './apiClient'
import { LocalLayoutRepository } from './LocalLayoutRepository'
import { RemoteLayoutRepository } from './RemoteLayoutRepository'
import type { LayoutRepository } from './LayoutRepository'

const localRepository: LayoutRepository = new LocalLayoutRepository()

/** Backend ativo. O padrão — e, na versão local sem conta, o único — é o localStorage: nada no
 * fluxo atual chama activateRemoteRepository, então o app funciona inteiro sem Worker/D1. */
let active: LayoutRepository = localRepository

/** Always a genuine localStorage-backed repository, regardless of which backend is currently
 * active — used by the Fase 9 migration flow, which needs to read local data even after the
 * active repository has already switched to remote. */
export function getLocalLayoutRepository(): LayoutRepository {
  return localRepository
}

/** Switches the active backend to the signed-in user's remote projects (Cloudflare Worker + D1).
 * Call right after a successful login/session restore. No-op when no Worker API is configured
 * (`VITE_API_BASE_URL`) — the local backend stays active instead of every call failing against a
 * host that isn't there. Unused by the current local-only flow; kept for the multi-user version. */
export function activateRemoteRepository(userId: string): void {
  if (!isRemoteApiConfigured()) return
  active = new RemoteLayoutRepository(userId)
}

/** Switches back to the local-only backend — call on logout so no further remote calls are made
 * (and so a subsequent login for a different user can't see the previous session's data). */
export function activateLocalRepository(): void {
  active = localRepository
}

/**
 * Facade whose methods always delegate to whichever backend is currently active. Every consumer
 * imports this single stable object — none of them need to know or care when the backend swaps
 * (e.g. right after login, see useAuthStore). See docs/ARCHITECTURE.md § Persistência (Fase 9).
 */
export const layoutRepository: LayoutRepository = {
  listLayouts: (...args) => active.listLayouts(...args),
  getLayout: (...args) => active.getLayout(...args),
  createLayout: (...args) => active.createLayout(...args),
  renameLayout: (...args) => active.renameLayout(...args),
  duplicateLayout: (...args) => active.duplicateLayout(...args),
  deleteLayout: (...args) => active.deleteLayout(...args),
  saveLayoutObjects: (...args) => active.saveLayoutObjects(...args),
  updateLayoutSettings: (...args) => active.updateLayoutSettings(...args),
  saveFlowBoard: (...args) => active.saveFlowBoard(...args),
}
