export type ObjectCategory =
  | 'structure'
  | 'storage'
  | 'pallet'
  | 'equipment'
  | 'area'
  | 'flow'
  | 'other'

export type ObjectTypeKey =
  | 'wall'
  | 'door'
  | 'dock'
  | 'rack'
  | 'corridor'
  | 'pallet'
  | 'forklift'
  | 'pallet-jack'
  | 'area'
  | 'flow-route'
  | 'shelf'
  | 'storage-block'
  | 'area-picking'
  | 'area-staging'
  | 'conveyor'
  | 'sorting-bench'
  | 'packing-table'
  | 'scale'
  | 'label-printer'
  | 'rf-scanner'
  | 'area-inspection'
  | 'area-shipping'
  | 'area-receiving'
  | 'directional-arrow'
  | 'traffic-lane'
  | 'intersection'
  | 'safety-zone'
  | 'pedestrian-lane'
  | 'platform-cart'
  | 'column'
  | 'gate'
  | 'stairs'
  | 'drive-in'
  | 'push-back'
  | 'flow-rack'
  | 'cantilever'
  | 'reach-truck'
  | 'tug'
  | 'order-picker'
  | 'box'
  | 'container'
  | 'cage-pallet'

/** All measurements (x, y, width, length) are in centimeters. Rotation is in degrees [0, 360). */
export interface LayoutObject {
  id: string
  objectType: ObjectTypeKey
  category: ObjectCategory
  name?: string
  x: number
  y: number
  width: number
  length: number
  rotationDeg: number
  zIndex: number
  properties: Record<string, unknown>
}

/** The current user's relationship to a project — see docs/ARCHITECTURE.md § Compartilhamento.
 * 'owner' can share/manage collaborators/delete; 'editor' can view and edit Layout/Flow but not
 * administer the project. Always 'owner' in the local (no-account) backend, where every project
 * belongs to the single on-device user. */
export type ProjectRole = 'owner' | 'editor'

export interface Layout {
  id: string
  organizationId: string
  name: string
  /** Optional free-text project description (Fase 9 — "Meus Projetos"). */
  description?: string
  scalePxPerMeter: number
  gridStepM: number
  widthM?: number
  heightM?: number
  createdAt: string
  updatedAt: string
  objects: LayoutObject[]
  /** Fluxo board data — belongs to the same project as `objects` (Layout), see docs/ARCHITECTURE.md
   * § Fluxo. Optional/absent on layouts saved before this field existed. */
  flowNodes?: import('./flow').FlowNode[]
  flowConnections?: import('./flow').FlowConnection[]
  /** The signed-in user's role on this project — see ProjectRole. */
  role: ProjectRole
  /** E-mail of the project's actual owner — equal to the current user's own e-mail when
   * `role === 'owner'`, otherwise whoever shared it. Used to label "Compartilhados comigo". */
  ownerEmail?: string
}

export type LayoutSummary = Pick<
  Layout,
  'id' | 'organizationId' | 'name' | 'description' | 'createdAt' | 'updatedAt' | 'role' | 'ownerEmail'
>

export interface NewLayoutInput {
  name: string
  description?: string
  widthM?: number
  heightM?: number
}
