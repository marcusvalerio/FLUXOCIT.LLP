import type { Env, ProjectMemberRow, ProjectRole, ProjectRow, UserRow } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): string {
  return crypto.randomUUID()
}

// --- users ---

export async function findUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE email = ?1 COLLATE NOCASE')
    .bind(email)
    .first<UserRow>()
  return row ?? null
}

export async function findUserById(env: Env, id: string): Promise<UserRow | null> {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?1').bind(id).first<UserRow>()
  return row ?? null
}

export async function createUser(env: Env, email: string, passwordHash: string): Promise<UserRow> {
  const id = newId()
  const now = nowIso()
  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, must_change_password, created_at, updated_at) VALUES (?1, ?2, ?3, 1, ?4, ?4)',
  )
    .bind(id, email, passwordHash, now)
    .run()
  return { id, email, password_hash: passwordHash, must_change_password: 1, created_at: now, updated_at: now }
}

export async function updateUserPassword(
  env: Env,
  userId: string,
  passwordHash: string,
  mustChangePassword: boolean,
): Promise<void> {
  await env.DB.prepare(
    'UPDATE users SET password_hash = ?1, must_change_password = ?2, updated_at = ?3 WHERE id = ?4',
  )
    .bind(passwordHash, mustChangePassword ? 1 : 0, nowIso(), userId)
    .run()
}

// --- sessions ---

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function createSession(env: Env, userId: string, tokenHash: string): Promise<string> {
  const id = tokenHash
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
  await env.DB.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)')
    .bind(id, userId, now.toISOString(), expiresAt.toISOString())
    .run()
  return expiresAt.toISOString()
}

export async function findValidSession(env: Env, tokenHash: string): Promise<{ userId: string } | null> {
  const row = await env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?1')
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string }>()
  if (!row) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(tokenHash).run()
    return null
  }
  return { userId: row.user_id }
}

export async function deleteSession(env: Env, tokenHash: string): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(tokenHash).run()
}

export async function deleteAllSessionsForUser(env: Env, userId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId).run()
}

// --- password reset tokens ---

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export async function createPasswordResetToken(env: Env, userId: string, tokenHash: string): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS)
  await env.DB.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)',
  )
    .bind(tokenHash, userId, now.toISOString(), expiresAt.toISOString())
    .run()
}

export async function consumePasswordResetToken(env: Env, tokenHash: string): Promise<{ userId: string } | null> {
  const row = await env.DB.prepare(
    'SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE id = ?1',
  )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string; used_at: string | null }>()
  if (!row || row.used_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  await env.DB.prepare('UPDATE password_reset_tokens SET used_at = ?1 WHERE id = ?2')
    .bind(nowIso(), tokenHash)
    .run()
  return { userId: row.user_id }
}

// --- projects ---

export type ProjectRowWithAccess = ProjectRow & { role: ProjectRole; owner_email: string }

/** Every project this user can see — owned or shared with them — each tagged with their role and
 * the actual owner's e-mail (so "Compartilhados comigo" can show who it belongs to). Membership
 * (project_members) is the only source of truth for visibility here, not `projects.user_id`, so a
 * shared project appears for its editor exactly like an owned one appears for its owner. */
export async function listProjectsForUser(env: Env, userId: string): Promise<ProjectRowWithAccess[]> {
  const { results } = await env.DB.prepare(
    `SELECT p.*, pm.role AS role, owner.email AS owner_email
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?1
       JOIN users owner ON owner.id = p.user_id
      ORDER BY p.updated_at DESC`,
  )
    .bind(userId)
    .all<ProjectRowWithAccess>()
  return results
}

/** Any member (owner or editor) can read — used by every route that only needs to know "does this
 * user have access at all", with the caller checking `.role` when a specific role is required. */
export async function findProjectForMember(env: Env, id: string, userId: string): Promise<ProjectRowWithAccess | null> {
  const row = await env.DB.prepare(
    `SELECT p.*, pm.role AS role, owner.email AS owner_email
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?2
       JOIN users owner ON owner.id = p.user_id
      WHERE p.id = ?1`,
  )
    .bind(id, userId)
    .first<ProjectRowWithAccess>()
  return row ?? null
}

/** Just the role, for callers that only need to authorize (not read the project itself) — e.g.
 * before an administrative action on the member list. Returns null for both "project doesn't
 * exist" and "user has no access to it" — the two are indistinguishable on purpose (see
 * worker/src/middleware.ts requireMembership), so an unauthorized caller can never use this to
 * tell a real project ID from a made-up one. */
export async function getMembership(env: Env, projectId: string, userId: string): Promise<{ role: ProjectRole } | null> {
  const row = await env.DB.prepare('SELECT role FROM project_members WHERE project_id = ?1 AND user_id = ?2')
    .bind(projectId, userId)
    .first<{ role: ProjectRole }>()
  return row ?? null
}

export interface NewProjectInput {
  name: string
  description?: string
  widthM?: number
  heightM?: number
}

export async function createProject(env: Env, userId: string, input: NewProjectInput): Promise<ProjectRow> {
  const id = newId()
  const now = nowIso()
  const row: ProjectRow = {
    id,
    user_id: userId,
    name: input.name,
    description: input.description ?? null,
    status: 'active',
    scale_px_per_meter: 50,
    grid_step_m: 0.1,
    width_m: input.widthM ?? null,
    height_m: input.heightM ?? null,
    layout_objects: '[]',
    flow_nodes: '[]',
    flow_connections: '[]',
    version: 1,
    created_at: now,
    updated_at: now,
  }
  // Inserting the project row and its owner membership as one D1 batch keeps them atomic — a
  // project can never briefly (or permanently, on a mid-write crash) exist without its owner
  // being a member, which is the one invariant every access check in this file depends on.
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO projects
        (id, user_id, name, description, status, scale_px_per_meter, grid_step_m, width_m, height_m,
         layout_objects, flow_nodes, flow_connections, version, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
    ).bind(
      row.id,
      row.user_id,
      row.name,
      row.description,
      row.status,
      row.scale_px_per_meter,
      row.grid_step_m,
      row.width_m,
      row.height_m,
      row.layout_objects,
      row.flow_nodes,
      row.flow_connections,
      row.version,
      row.created_at,
      row.updated_at,
    ),
    env.DB.prepare('INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?1, ?2, ?3, ?4)').bind(
      row.id,
      row.user_id,
      'owner',
      now,
    ),
  ])
  return row
}

/** Rename/delete are owner-only administrative actions. The route layer already checks this via
 * requireMembership before calling here (see routes/projects.ts) — the `user_id = ?` filter is
 * kept as a second, independent layer at the data boundary itself (ownership never transfers in
 * this phase, so `projects.user_id` and "the project_members row with role='owner'" always name
 * the same person), so a bug in the route-level check alone could never let it through. */
export async function renameProject(env: Env, id: string, ownerId: string, name: string): Promise<boolean> {
  const result = await env.DB.prepare('UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4')
    .bind(name, nowIso(), id, ownerId)
    .run()
  return (result.meta.changes ?? 0) > 0
}

export async function deleteProject(env: Env, id: string, ownerId: string): Promise<boolean> {
  const result = await env.DB.prepare('DELETE FROM projects WHERE id = ?1 AND user_id = ?2')
    .bind(id, ownerId)
    .run()
  return (result.meta.changes ?? 0) > 0
}

export interface LayoutSaveInput {
  objects: unknown[]
  widthM?: number
  heightM?: number
  scalePxPerMeter?: number
  gridStepM?: number
}

/** Owner and editor can both write Layout/Flow — unlike rename/delete above, the filter here is
 * "any project_members row for this user", not `projects.user_id`, since an editor (who never
 * appears as `user_id`) must still be able to save. Kept as its own EXISTS clause rather than
 * trusting the route's requireMembership check alone, for the same defense-in-depth reason. */
export async function saveProjectLayout(
  env: Env,
  id: string,
  userId: string,
  input: LayoutSaveInput,
): Promise<boolean> {
  const result = await env.DB.prepare(
    `UPDATE projects SET
       layout_objects = ?1,
       width_m = COALESCE(?2, width_m),
       height_m = COALESCE(?3, height_m),
       scale_px_per_meter = COALESCE(?4, scale_px_per_meter),
       grid_step_m = COALESCE(?5, grid_step_m),
       version = version + 1,
       updated_at = ?6
     WHERE id = ?7
       AND EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = ?8)`,
  )
    .bind(
      JSON.stringify(input.objects),
      input.widthM ?? null,
      input.heightM ?? null,
      input.scalePxPerMeter ?? null,
      input.gridStepM ?? null,
      nowIso(),
      id,
      userId,
    )
    .run()
  return (result.meta.changes ?? 0) > 0
}

export async function saveProjectFlow(
  env: Env,
  id: string,
  userId: string,
  flowNodes: unknown[],
  flowConnections: unknown[],
): Promise<boolean> {
  const result = await env.DB.prepare(
    `UPDATE projects SET flow_nodes = ?1, flow_connections = ?2, version = version + 1, updated_at = ?3
     WHERE id = ?4
       AND EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = ?5)`,
  )
    .bind(JSON.stringify(flowNodes), JSON.stringify(flowConnections), nowIso(), id, userId)
    .run()
  return (result.meta.changes ?? 0) > 0
}

/** The copy always belongs to whoever duplicates it — `callerId`, not `source.user_id` — so an
 * editor duplicating a project they were only shared can get their own independent copy (with
 * source's collaborators not carried over; that's a deliberate scope cut, see final report). */
export async function duplicateProject(env: Env, source: ProjectRow, callerId: string, newName: string): Promise<ProjectRow> {
  const id = newId()
  const now = nowIso()
  const row: ProjectRow = {
    ...source,
    id,
    user_id: callerId,
    name: newName,
    version: 1,
    created_at: now,
    updated_at: now,
  }
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO projects
        (id, user_id, name, description, status, scale_px_per_meter, grid_step_m, width_m, height_m,
         layout_objects, flow_nodes, flow_connections, version, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
    ).bind(
      row.id,
      row.user_id,
      row.name,
      row.description,
      row.status,
      row.scale_px_per_meter,
      row.grid_step_m,
      row.width_m,
      row.height_m,
      row.layout_objects,
      row.flow_nodes,
      row.flow_connections,
      row.version,
      row.created_at,
      row.updated_at,
    ),
    env.DB.prepare('INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?1, ?2, ?3, ?4)').bind(
      row.id,
      callerId,
      'owner',
      now,
    ),
  ])
  return row
}

// --- project members (sharing) ---

export interface ProjectMemberView {
  userId: string
  email: string
  role: ProjectRole
  createdAt: string
}

/** Owner first, then editors by when they joined — matches the UI example in the spec (owner row
 * on top of the collaborator list). */
export async function listProjectMembers(env: Env, projectId: string): Promise<ProjectMemberView[]> {
  const { results } = await env.DB.prepare(
    `SELECT pm.user_id AS userId, u.email AS email, pm.role AS role, pm.created_at AS createdAt
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = ?1
      ORDER BY CASE pm.role WHEN 'owner' THEN 0 ELSE 1 END, pm.created_at ASC`,
  )
    .bind(projectId)
    .all<ProjectMemberView>()
  return results
}

export type AddMemberResult =
  | { ok: true; member: ProjectMemberView }
  | { ok: false; reason: 'user_not_found' | 'already_member' }

/** Invites always grant 'editor' — inviting as 'owner' isn't offered anywhere in the UI, so this
 * function has no way to be called with role='owner' in the first place (see routes/projects.ts).
 * The invited person must already have an ARGUS account (no invite-by-registration flow in this
 * phase — matches "não criar colaboração em tempo real" scope cut in the brief). */
export async function addProjectMember(env: Env, projectId: string, email: string): Promise<AddMemberResult> {
  const user = await findUserByEmail(env, email)
  if (!user) return { ok: false, reason: 'user_not_found' }

  const existing = await getMembership(env, projectId, user.id)
  if (existing) return { ok: false, reason: 'already_member' }

  const createdAt = nowIso()
  await env.DB.prepare(
    'INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?1, ?2, ?3, ?4)',
  )
    .bind(projectId, user.id, 'editor', createdAt)
    .run()
  return { ok: true, member: { userId: user.id, email: user.email, role: 'editor', createdAt } }
}

export type RemoveMemberResult = 'removed' | 'not_found' | 'cannot_remove_owner'

/** The owner's own membership row can never be removed through this path — there is no ownership
 * transfer in this phase (see spec Part 3: "EDITOR NÃO pode ... alterar ownership"), so a project
 * with no owner member would be unreachable by anyone. */
export async function removeProjectMember(env: Env, projectId: string, userId: string): Promise<RemoveMemberResult> {
  const membership = await getMembership(env, projectId, userId)
  if (!membership) return 'not_found'
  if (membership.role === 'owner') return 'cannot_remove_owner'

  await env.DB.prepare('DELETE FROM project_members WHERE project_id = ?1 AND user_id = ?2')
    .bind(projectId, userId)
    .run()
  return 'removed'
}
