import { describe, expect, it } from 'vitest'
import { matchesQuery, normalizeSearchText, searchCatalog } from './search'
import { OBJECT_CATALOG, OBJECT_CATEGORIES_ORDER } from '../objects/catalog'

const forklift = OBJECT_CATALOG.forklift
const rack = OBJECT_CATALOG.rack

describe('busca da biblioteca', () => {
  it('ignora acento, caixa e pontuação', () => {
    expect(normalizeSearchText('Porta-paletes')).toBe('porta paletes')
    expect(normalizeSearchText('  ÁREA de Picking ')).toBe('area de picking')
  })

  it('encontra pelo nome, mesmo sem acento e em caixa diferente', () => {
    expect(matchesQuery(forklift, 'EMPILHADEIRA')).toBe(true)
    expect(matchesQuery(OBJECT_CATALOG['area-picking'], 'area picking')).toBe(true)
    expect(matchesQuery(rack, 'porta paletes')).toBe(true)
  })

  it('encontra pela função descrita na linha, não só pelo nome', () => {
    expect(matchesQuery(OBJECT_CATALOG.conveyor, 'transporte')).toBe(true)
    expect(matchesQuery(OBJECT_CATALOG.dock, 'carga')).toBe(true)
  })

  it('exige todos os termos digitados', () => {
    expect(matchesQuery(forklift, 'empilhadeira movimentacao')).toBe(true)
    expect(matchesQuery(forklift, 'empilhadeira parede')).toBe(false)
  })

  it('consulta vazia não filtra nada', () => {
    expect(matchesQuery(rack, '')).toBe(true)
    expect(matchesQuery(rack, '   ')).toBe(true)
  })

  it('agrupa resultados por categoria, omitindo grupos vazios', () => {
    const groups = searchCatalog('doca', OBJECT_CATEGORIES_ORDER)
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.every((g) => g.items.length > 0)).toBe(true)
    expect(groups.flatMap((g) => g.items).map((d) => d.key)).toContain('dock')
  })

  it('não retorna grupo algum quando nada casa', () => {
    expect(searchCatalog('zzzzz', OBJECT_CATEGORIES_ORDER)).toEqual([])
  })
})
