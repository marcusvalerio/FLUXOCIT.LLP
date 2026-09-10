import type { ObjectTypeKey } from '../../../types/layout'

/**
 * Papel logístico de cada tipo de objeto — a fonte única de "o que esta coisa é" para o resto
 * do editor.
 *
 * A categoria do catálogo diz onde o objeto aparece na biblioteca; o papel diz como ele se
 * comporta: o que alonga em vez de engrossar, o que assenta numa estrutura, o que circula por um
 * corredor. Antes esse conhecimento vivia espalhado (um conjunto em `capabilities`, outro no snap
 * logístico) e nada garantia que os dois concordassem.
 */
export type ObjectRole =
  /** Tem eixo e espessura característica: parede, corredor, faixa, rota. */
  | 'linear'
  /** Estrutura que recebe carga unitizada: porta-paletes, estante, drive-in… */
  | 'storage'
  /** Carga unitizada: pallet, caixa, contêiner, gaiola. */
  | 'unit-load'
  /** Equipamento que circula: empilhadeira, paleteira, rebocador… */
  | 'mobile-equipment'
  /** Via de circulação — subconjunto de 'linear' pelo lado do trânsito. */
  | 'circulation'
  /** Área operacional (região semântica do layout). */
  | 'area'
  /** Estrutura fixa e demais objetos. */
  | 'structure'

export const LINEAR_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'wall',
  'corridor',
  'traffic-lane',
  'pedestrian-lane',
  'flow-route',
])

export const CIRCULATION_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'corridor',
  'traffic-lane',
  'pedestrian-lane',
  'flow-route',
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

const AREA_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'area',
  'area-picking',
  'area-staging',
  'area-inspection',
  'area-shipping',
  'area-receiving',
  'safety-zone',
])

/** Um papel por tipo, na ordem em que os papéis são mais específicos. */
export function getObjectRole(objectType: ObjectTypeKey): ObjectRole {
  if (CIRCULATION_TYPES.has(objectType)) return 'circulation'
  if (LINEAR_TYPES.has(objectType)) return 'linear'
  if (STORAGE_TYPES.has(objectType)) return 'storage'
  if (UNIT_LOAD_TYPES.has(objectType)) return 'unit-load'
  if (MOBILE_EQUIPMENT_TYPES.has(objectType)) return 'mobile-equipment'
  if (AREA_TYPES.has(objectType)) return 'area'
  return 'structure'
}
