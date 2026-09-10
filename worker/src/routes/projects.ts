import { Hono } from 'hono'
import {
  createProject,
  deleteProject,
  duplicateProject,
  findProjectForUser,
  listProjectsForUser,
  renameProject,
  saveProjectFlow,
  saveProjectLayout,
} from '../db'
import { isArrayBody, readJsonBody, readNumber, readString } from '../http'
import { requireAuth } from '../middleware'
import type { Env, ProjectRow, SessionUser } from '../types'

export const projectRoutes = new Hono<{ Bindings: Env; Variables: { user: SessionUser } }>()

projectRoutes.use('*', requireAuth)

function toSummary(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toFull(row: ProjectRow) {
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
  return c.json({ project: toFull(row) }, 201)
})

projectRoutes.get('/:id', async (c) => {
  const row = await findProjectForUser(c.env, c.req.param('id'), c.get('user').id)
  if (!row) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.json({ project: toFull(row) })
})

projectRoutes.patch('/:id', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
  const body = await readJsonBody<Record<string, unknown>>(c)
  const name = readString(body.name)
  if (!name) return c.json({ error: 'Nome não pode ser vazio.' }, 400)

  const ok = await renameProject(c.env, id, userId, name)
  if (!ok) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.body(null, 204)
})

projectRoutes.delete('/:id', async (c) => {
  const ok = await deleteProject(c.env, c.req.param('id'), c.get('user').id)
  if (!ok) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.body(null, 204)
})

projectRoutes.post('/:id/duplicate', async (c) => {
  const userId = c.get('user').id
  const source = await findProjectForUser(c.env, c.req.param('id'), userId)
  if (!source) return c.json({ error: 'Projeto não encontrado.' }, 404)
  const copy = await duplicateProject(c.env, source, `${source.name} (cópia)`)
  return c.json({ project: toFull(copy) }, 201)
})

projectRoutes.put('/:id/layout', async (c) => {
  const userId = c.get('user').id
  const id = c.req.param('id')
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
  const body = await readJsonBody<Record<string, unknown>>(c)
  if (!isArrayBody(body.flowNodes) || !isArrayBody(body.flowConnections)) {
    return c.json({ error: 'Corpo inválido: flowNodes/flowConnections devem ser listas.' }, 400)
  }
  const ok = await saveProjectFlow(c.env, id, userId, body.flowNodes, body.flowConnections)
  if (!ok) return c.json({ error: 'Projeto não encontrado.' }, 404)
  return c.body(null, 204)
})
