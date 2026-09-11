import { apiFetch } from './apiClient'
import type { Layout, LayoutObject, LayoutSummary, NewLayoutInput, ProjectRole } from '../../types/layout'
import type { FlowConnection, FlowNode } from '../../types/flow'
import type { LayoutRepository } from './LayoutRepository'

interface ApiProjectSummary {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  role: ProjectRole
  ownerEmail: string
}

interface ApiProjectFull extends ApiProjectSummary {
  scalePxPerMeter: number
  gridStepM: number
  widthM?: number
  heightM?: number
  objects: LayoutObject[]
  flowNodes: FlowNode[]
  flowConnections: FlowConnection[]
  version: number
}

/** Stand-in for the old org-scoped ownership model (see types/layout.ts) — Fase 9 owns projects
 * directly by user, so this field carries no real meaning server-side anymore; kept only so the
 * `Layout` shape stays satisfied without widening the type for every caller. */
function toLayoutSummary(p: ApiProjectSummary, userId: string): LayoutSummary {
  return {
    id: p.id,
    organizationId: userId,
    name: p.name,
    description: p.description ?? undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    role: p.role,
    ownerEmail: p.ownerEmail,
  }
}

function toLayout(p: ApiProjectFull, userId: string): Layout {
  return {
    ...toLayoutSummary(p, userId),
    scalePxPerMeter: p.scalePxPerMeter,
    gridStepM: p.gridStepM,
    widthM: p.widthM,
    heightM: p.heightM,
    objects: p.objects,
    flowNodes: p.flowNodes,
    flowConnections: p.flowConnections,
  }
}

/**
 * Worker-backed implementation of LayoutRepository (Fase 9) — every method maps to one
 * `/api/projects` endpoint. The session cookie (HttpOnly) authenticates every request; there is
 * no token to manage here. See worker/src/routes/projects.ts for the server side and
 * docs/ARCHITECTURE.md § Persistência for how this replaces LocalLayoutRepository once a user is
 * signed in.
 */
export class RemoteLayoutRepository implements LayoutRepository {
  private readonly userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async listLayouts(): Promise<LayoutSummary[]> {
    const { projects } = await apiFetch<{ projects: ApiProjectSummary[] }>('/api/projects')
    return projects.map((p) => toLayoutSummary(p, this.userId))
  }

  async getLayout(id: string): Promise<Layout | null> {
    try {
      const { project } = await apiFetch<{ project: ApiProjectFull }>(`/api/projects/${id}`)
      return toLayout(project, this.userId)
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) return null
      throw err
    }
  }

  async createLayout(input: NewLayoutInput): Promise<Layout> {
    const { project } = await apiFetch<{ project: ApiProjectFull }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return toLayout(project, this.userId)
  }

  async renameLayout(id: string, name: string): Promise<void> {
    await apiFetch(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
  }

  async duplicateLayout(id: string): Promise<Layout> {
    const { project } = await apiFetch<{ project: ApiProjectFull }>(`/api/projects/${id}/duplicate`, {
      method: 'POST',
    })
    return toLayout(project, this.userId)
  }

  async deleteLayout(id: string): Promise<void> {
    await apiFetch(`/api/projects/${id}`, { method: 'DELETE' })
  }

  async saveLayoutObjects(id: string, objects: LayoutObject[]): Promise<void> {
    await apiFetch(`/api/projects/${id}/layout`, { method: 'PUT', body: JSON.stringify({ objects }) })
  }

  async updateLayoutSettings(id: string, settings: Partial<Pick<Layout, 'widthM' | 'heightM'>>): Promise<void> {
    // The Worker's layout endpoint saves objects + settings together (one row, one write) — reuse
    // it here with the current objects so a settings-only change doesn't need its own endpoint.
    const current = await this.getLayout(id)
    await apiFetch(`/api/projects/${id}/layout`, {
      method: 'PUT',
      body: JSON.stringify({ objects: current?.objects ?? [], ...settings }),
    })
  }

  async saveFlowBoard(id: string, flowNodes: FlowNode[], flowConnections: FlowConnection[]): Promise<void> {
    await apiFetch(`/api/projects/${id}/flow`, {
      method: 'PUT',
      body: JSON.stringify({ flowNodes, flowConnections }),
    })
  }
}
