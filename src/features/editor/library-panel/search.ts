import { CATEGORY_LABELS, OBJECT_CATALOG, getObjectDescription } from '../objects/catalog'
import type { ObjectTypeDefinition } from '../objects/types'

/**
 * Busca da biblioteca — lógica pura, separada do componente para poder ser testada sem canvas.
 *
 * Tolerante a acento e caixa ("porta paletes" acha "Porta-paletes", "area" acha "Área") e por
 * termos: cada palavra digitada precisa aparecer em algum campo do objeto (nome, função,
 * categoria ou chave), então "empilhadeira carga" continua achando a empilhadeira.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

function haystackFor(def: ObjectTypeDefinition): string {
  return normalizeSearchText(
    `${def.label} ${getObjectDescription(def.key)} ${CATEGORY_LABELS[def.category] ?? ''} ${def.key}`,
  )
}

export function matchesQuery(def: ObjectTypeDefinition, query: string): boolean {
  const normalized = normalizeSearchText(query)
  if (!normalized) return true
  const haystack = haystackFor(def)
  return normalized.split(' ').every((term) => haystack.includes(term))
}

/** Resultados agrupados por categoria, na ordem da biblioteca; grupos vazios são omitidos. */
export function searchCatalog(
  query: string,
  categories: readonly string[],
): { category: string; items: ObjectTypeDefinition[] }[] {
  const hits = Object.values(OBJECT_CATALOG).filter((def) => matchesQuery(def, query))
  return categories
    .map((category) => ({ category, items: hits.filter((def) => def.category === category) }))
    .filter((group) => group.items.length > 0)
}
