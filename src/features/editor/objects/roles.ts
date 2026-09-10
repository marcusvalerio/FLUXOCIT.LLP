import type { ObjectTypeKey } from '../../../types/layout'
import {
  AREA_TYPES,
  CIRCULATION_TYPES,
  LINEAR_TYPES,
  MOBILE_EQUIPMENT_TYPES,
  STORAGE_TYPES,
  UNIT_LOAD_TYPES,
} from '../../../shared/lib/logisticsTypes'

/**
 * Papel logístico de cada tipo de objeto — a fonte única de "o que esta coisa é" para o resto
 * do editor.
 *
 * A categoria do catálogo diz onde o objeto aparece na biblioteca; o papel diz como ele se
 * comporta: o que alonga em vez de engrossar, o que assenta numa estrutura, o que circula por um
 * corredor. Os grupos semânticos vivem em `shared/lib/logisticsTypes.ts` para que métricas e regras
 * espaciais usem exatamente o mesmo vocabulário.
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

export { AREA_TYPES, CIRCULATION_TYPES, LINEAR_TYPES, MOBILE_EQUIPMENT_TYPES, STORAGE_TYPES, UNIT_LOAD_TYPES }

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
