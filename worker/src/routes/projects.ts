import { Hono } from 'hono'
import {
  addProjectMember,
  createProject,
  deleteProject,
  duplicateProject,
  findProjectForMember,
  getMembership,
  listProjectMembers,
  listProjectsForUser,
  removeProjectMember,
  renameProject,
  saveProjectFlow,
  saveProjectLayout,
} from '../db'
import type { ProjectRowWithAccess } from '../db'
import { isArrayBody, readJsonBody, readNumber, readString } from '../http'
import { requireAuth } from '../middleware'
import type { Env, ProjectRole, SessionUser } from '../types'

export const projectRoutes = new Hono<{ Bindings: Env; Variables: { user: SessionUser } }>()

projectRoutes.use('*', requireAuth)

function toSummary(row: ProjectRowWithAccess) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role: row.role,
    ownerEmail: row.owner_email,
  }
}

function toFull(row: ProjectRowWithAccess) {
  return {
    ...toSummary(row),
    scalePxPerMeter: row.scale_px_per_meter,
    gridStepM: row.grid_step_m,
    widthM: row.width_m ?? undefined,
    heightM: row.height_m ?? undefined,
    objects: JSON.parse(row.layout_objects),
    flowNodes: JSON.parse(row.flow_nodes),
    flowConnections: JSON.parse(row.flow_connections),
    version: row.version,
  }
}

/**
 * The one place every route below asks "can this user do this?". Returns the caller's membership
 * when it meets `minRole` (owner satisfies both 'owner' and 'editor' checks; editor only
 * satisfies 'editor'), otherwise `null` — callers turn a `null` into 404 (no membership at all —
 * matches PARTE 4 do briefing: "um usuário não pode acessar um projeto simplesmente conhecendo
 * seu ID", so existence is never confirmed to someone with zero access) or 403 (membership
 * exists, but the role isn't enough for an administrative action — the caller already knows the
 * project exists because it's in their own list, so there's nothing left to leak).
 */
async function checkAccess(
  env: Env,
  projectId: string,
  userId: string,
  minRole: ProjectRole,
): Promise<{ role: ProjectRole } | null> {
  const membership = await getMembership(env, projectId, userId)
  if (!membership) return null
  if (minRole === 'owner' && membership.role !== 'owner') return null
  return membership
}

projectRoutes.get('/', async (c) => {
  const rows = await listProjectsForUser(c.env, c.get('user').id)
  return c.json({ projects: rows.map(toSummary) })
})

projectRoutes.post('/', async (c) => {
  // O corpo é JSON arbitrário: cada campo é lido pelo tipo esperado. Nome ausente ou vazio cai
  // no padrão de propósito (criar projeto não deve exigir batismo); tipo errado não derruba nada.
  const body = await readJsonBody<Record<string, unknown>>(c)
  const row = await createProject(c.env, c.get('user').id, {
    name: readString(body.name) ?? 'Novo projeto',
    description: readString(body.description),
    widthM: readNumber(body.widthM),
    heightM: readNumber(body.heightM),
  })
  return c.json({ project: toFull({ ...row, role: 'owner', owner_email: c.get('user').email }) }, 201)
})

projectRoutes.get('/:id', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  if (!(await checkAccess(c.env, id, userId, 'editor'))) return c.json({ error: 'Projeto não encontrado.' }, 404)
  const row = await findProjectForMember(c.env, id, userId)
  if (!row) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.json({ project: toFull(row) })
})

projectRoutes.patch('/:id', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  const access = await checkAccess(c.env, id, userId, 'owner')
  if (!access) {
    const anyAccess = await getMembership(c.env, id, userId)
    return c.json({ error: anyAccess ? 'Só o proprietário pode renomear o projeto.' : 'Projeto não encontrado.' }, anyAccess ? 403 : 404)
  }

  const body = await readJsonBody<Record<string, unknown>>(c)
  const name = readString(body.name)
  if (!name) return c.json({ error: 'Nome não pode ser vazio.' }, 400)

  const ok = await renameProject(c.env, id, userId, name)
  if (!ok) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.body(null, 204)
})

projectRoutes.delete('/:id', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  const access = await checkAccess(c.env, id, userId, 'owner')
  if (!access) {
    const anyAccess = await getMembership(c.env, id, userId)
    return c.json({ error: anyAccess ? 'Só o proprietário pode excluir o projeto.' : 'Projeto não encontrado.' }, anyAccess ? 403 : 404)
  }

  const ok = await deleteProject(c.env, id, userId)
  if (!ok) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.body(null, 204)
})

projectRoutes.post('/:id/duplicate', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  if (!(await checkAccess(c.env, id, userId, 'editor'))) return c.json({ error: 'Projeto não encontrado.' }, 404)
  const source = await findProjectForMember(c.env, id, userId)
  if (!source) return c.json({ error: 'Projeto não encontrado.' }, 404)
  const copy = await duplicateProject(c.env, source, userId, `${source.name} (cópia)`)
  return c.json({ project: toFull({ ...copy, role: 'owner', owner_email: c.get('user').email }) }, 201)
})

projectRoutes.put('/:id/layout', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  if (!(await checkAccess(c.env, id, userId, 'editor'))) return c.json({ error: 'Projeto não encontrado.' }, 404)

  const body = await readJsonBody<Record<string, unknown>>(c)
  if (!isArrayBody(body.objects)) {
    return c.json({ error: 'Corpo inválido: objects deve ser uma lista.' }, 400)
  }
  const ok = await saveProjectLayout(c.env, id, userId, {
    objects: body.objects,
    widthM: readNumber(body.widthM),
    heightM: readNumber(body.heightM),
    scalePxPerMeter: readNumber(body.scalePxPerMeter),
    gridStepM: readNumber(body.gridStepM),
  })
  if (!ok) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.body(null, 204)
})

projectRoutes.put('/:id/flow', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  if (!(await checkAccess(c.env, id, userId, 'editor'))) return c.json({ error: 'Projeto não encontrado.' }, 404)

  const body = await readJsonBody<Record<string, unknown>>(c)
  if (!isArrayBody(body.flowNodes) || !isArrayBody(body.flowConnections)) {
    return c.json({ error: 'Corpo inválido: flowNodes/flowConnections devem ser listas.' }, 400)
  }
  const ok = await saveProjectFlow(c.env, id, userId, body.flowNodes, body.flowConnections)
  if (!ok) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.body(null, 204)
})

// --- sharing ---

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Owner and editor can both see who has access (matches the UI example: everyone with the
 * project open can see "Marcus — Proprietário / João — Editor"); only the owner gets to change
 * it (POST/DELETE below). */
projectRoutes.get('/:id/members', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  if (!(await checkAccess(c.env, id, userId, 'editor'))) return c.json({ error: 'Projeto não encontrado.' }, 404)
  const members = await listProjectMembers(c.env, id)
  return c.json({ members })
})

projectRoutes.post('/:id/members', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  const access = await checkAccess(c.env, id, userId, 'owner')
  if (!access) {
    const anyAccess = await getMembership(c.env, id, userId)
    return c.json(
      { error: anyAccess ? 'Só o proprietário pode compartilhar o projeto.' : 'Projeto não encontrado.' },
      anyAccess ? 403 : 404,
    )
  }

  const body = await readJsonBody<Record<string, unknown>>(c)
  const email = readString(body.email)?.toLowerCase()
  if (!email || !EMAIL_RE.test(email)) return c.json({ error: 'Informe um e-mail válido.' }, 400)
  if (email === c.get('user').email.toLowerCase()) {
    return c.json({ error: 'Você já é o proprietário deste projeto.' }, 400)
  }

  const result = await addProjectMember(c.env, id, email)
  if (!result.ok) {
    if (result.reason === 'user_not_found') {
      return c.json({ error: 'Nenhuma conta ARGUS.LLP encontrada com este e-mail.' }, 404)
    }
    return c.json({ error: 'Esta pessoa já tem acesso ao projeto.' }, 409)
  }
  return c.json({ member: result.member }, 201)
})

projectRoutes.delete('/:id/members/:userId', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  const targetUserId = c.req.param('userId')
  const access = await checkAccess(c.env, id, userId, 'owner')
  if (!access) {
    const anyAccess = await getMembership(c.env, id, userId)
    return c.json(
      { error: anyAccess ? 'Só o proprietário pode remover colaboradores.' : 'Projeto não encontrado.' },
      anyAccess ? 403 : 404,
    )
  }

  const result = await removeProjectMember(c.env, id, targetUserId)
  if (result === 'not_found') return c.json({ error: 'Colaborador não encontrado.' }, 404)
  if (result === 'cannot_remove_owner') return c.json({ error: 'O proprietário não pode ser removido.' }, 400)
  return c.body(null, 204)
})
