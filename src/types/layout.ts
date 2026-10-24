export type ObjectCategory =
  | 'structure'
  | 'storage'
  | 'pallet'
  | 'equipment'
  | 'area'
  | 'flow'
  | 'safety'
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
  | 'fire-extinguisher'
  | 'fire-hydrant'
  | 'emergency-exit'
  | 'emergency-light'
  | 'eyewash'

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
}

export type LayoutSummary = Pick<
  Layout,
  'id' | 'organizationId' | 'name' | 'description' | 'createdAt' | 'updatedAt'
>

export interface NewLayoutInput {
  name: string
  description?: string
  widthM?: number
  heightM?: number
}
