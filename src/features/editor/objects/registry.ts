import { OBJECT_CATALOG, getObjectDescription } from './catalog'
import { getObjectCapabilities, type ObjectCapabilities } from './capabilities'
import { getObjectRole, type ObjectRole } from './roles'
import type { ObjectTypeDefinition, PropertyFieldDefinition } from './types'
import type { ObjectTypeKey } from '../../../types/layout'

/**
 * Registry de objetos: a visão completa de um tipo, reunida de uma vez.
 *
 * O catálogo continua sendo a definição-mãe (geometria, desenho técnico, campos editáveis); o
 * registry compõe a ela o que o editor precisa saber para *tratar* o objeto — papel logístico,
 * o que ele permite transformar, limites de dimensão, descrição.
 *
 * O ponto é a extensibilidade: acrescentar um objeto novo é acrescentar uma entrada no catálogo
 * (e, se ele tiver comportamento próprio, um papel em `roles.ts`). Nada no núcleo do editor —
 * canvas, ferramentas, propriedades, snapping — precisa saber que ele existe.
 */
export interface ObjectProfile {
  key: ObjectTypeKey
  label: string
  description: string
  category: ObjectTypeDefinition['category']
  role: ObjectRole
  defaultWidth: number
  defaultLength: number
  /** Menor lado aceito ao redimensionar (cm). */
  minSizeCm: number
  /** Maior lado aceito (cm) — teto generoso, só para evitar arrasto acidental catastrófico. */
  maxSizeCm: number
  capabilities: ObjectCapabilities
  propertyFields: PropertyFieldDefinition[]
  render: ObjectTypeDefinition['render']
}

/** Piso e teto de dimensão. Um pallet não encolhe a 5 cm; nada precisa passar de 200 m de lado. */
const DEFAULT_MIN_SIZE_CM = 20
const DEFAULT_MAX_SIZE_CM = 20000

/** Elementos lineares podem ser finos: a espessura é característica do tipo, não um erro. */
const LINEAR_MIN_SIZE_CM = 5

export function getObjectProfile(objectType: ObjectTypeKey): ObjectProfile {
  const def = OBJECT_CATALOG[objectType]
  const role = getObjectRole(objectType)

  return {
    key: def.key,
    label: def.label,
    description: getObjectDescription(objectType),
    category: def.category,
    role,
    defaultWidth: def.defaultWidth,
    defaultLength: def.defaultLength,
    minSizeCm: role === 'linear' || role === 'circulation' ? LINEAR_MIN_SIZE_CM : DEFAULT_MIN_SIZE_CM,
    maxSizeCm: DEFAULT_MAX_SIZE_CM,
    capabilities: getObjectCapabilities(objectType),
    propertyFields: def.propertyFields,
    render: def.render,
  }
}

/** Todos os perfis, na ordem do catálogo — útil para a biblioteca e para varreduras de validação. */
export function getAllObjectProfiles(): ObjectProfile[] {
  return (Object.keys(OBJECT_CATALOG) as ObjectTypeKey[]).map(getObjectProfile)
}
