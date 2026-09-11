import { apiFetch } from './apiClient'
import type { ProjectRole } from '../../types/layout'

export interface Collaborator {
  userId: string
  email: string
  role: ProjectRole
  createdAt: string
}

export type InviteResult = { ok: true; member: Collaborator } | { ok: false; error: string }

/**
 * Thin wrapper around the Worker's `/api/projects/:id/members` endpoints (see
 * worker/src/routes/projects.ts) — the actual authorization (only the owner may invite/remove,
 * only members may list) lives entirely server-side. This module has no local/no-account
 * equivalent: sharing only exists once there's a real backend with real users to share with (see
 * shared/data/authMode), so every caller must itself be gated by `isAccountModeEnabled()`.
 */
export async function listCollaborators(projectId: string): Promise<Collaborator[]> {
  const { members } = await apiFetch<{ members: Collaborator[] }>(`/api/projects/${projectId}/members`)
  return members
}

/** Never throws on a normal "can't invite this person" outcome (not found / already a member) —
 * those are expected user-facing states, not exceptions. A network/auth failure still throws. */
export async function inviteCollaborator(projectId: string, email: string): Promise<InviteResult> {
  try {
    const { member } = await apiFetch<{ member: Collaborator }>(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    return { ok: true, member }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Não foi possível convidar esta pessoa.'
    return { ok: false, error: message }
  }
}

export async function removeCollaborator(projectId: string, userId: string): Promise<void> {
  await apiFetch(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' })
}
