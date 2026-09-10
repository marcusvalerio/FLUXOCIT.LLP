import type { ObjectTypeKey } from '../../types/layout'

/**
 * Vocabulário logístico canônico compartilhado por editor, métricas e regras espaciais.
 *
 * Este módulo não contém comportamento de UI: apenas a classificação semântica dos tipos.
 * `features/editor/objects/roles.ts` compõe esses grupos em papéis de objeto; consumidores
 * compartilhados devem importar daqui para evitar classificações divergentes.
 */
export const LINEAR_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'wall',
  'corridor',
  'traffic-lane',
  'pedestrian-lane',
  'flow-route',
  'intersection',
])

export const CIRCULATION_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'corridor',
  'traffic-lane',
  'pedestrian-lane',
  'flow-route',
  'intersection',
])

export const STORAGE_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'rack',
  'shelf',
  'storage-block',
  'drive-in',
  'push-back',
  'flow-rack',
  'cantilever',
])

export const UNIT_LOAD_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'pallet',
  'box',
  'container',
  'cage-pallet',
])

export const MOBILE_EQUIPMENT_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'forklift',
  'reach-truck',
  'pallet-jack',
  'order-picker',
  'tug',
  'platform-cart',
])

export const AREA_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'area',
  'area-picking',
  'area-staging',
  'area-inspection',
  'area-shipping',
  'area-receiving',
  'safety-zone',
])
