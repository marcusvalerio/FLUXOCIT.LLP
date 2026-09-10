import { describe, expect, it } from 'vitest'
import { anchorsForResizeMode, getObjectCapabilities } from './capabilities'
import { OBJECT_CATALOG } from './catalog'
import type { ObjectTypeKey } from '../../../types/layout'

describe('capacidades declaradas por tipo de objeto', () => {
  it('elementos lineares só alongam no próprio comprimento', () => {
    for (const key of ['wall', 'corridor', 'traffic-lane'] as ObjectTypeKey[]) {
      expect(getObjectCapabilities(key).resize).toBe('length')
      expect(anchorsForResizeMode('length')).toEqual(['middle-left', 'middle-right'])
    }
  })

  it('objetos de dimensão real não redimensionam', () => {
    expect(getObjectCapabilities('pallet').resize).toBe('none')
    expect(getObjectCapabilities('forklift').resize).toBe('none')
    expect(anchorsForResizeMode('none')).toEqual([])
  })

  it('áreas e estruturas retangulares usam as oito alças', () => {
    expect(getObjectCapabilities('area').resize).toBe('both')
    expect(getObjectCapabilities('rack').resize).toBe('both')
    expect(anchorsForResizeMode('both')).toHaveLength(8)
  })

  it('todo tipo do catálogo declara uma capacidade válida', () => {
    for (const key of Object.keys(OBJECT_CATALOG) as ObjectTypeKey[]) {
      const caps = getObjectCapabilities(key)
      expect(['both', 'length', 'none']).toContain(caps.resize)
      // Um objeto não redimensionável no catálogo nunca pode aparecer como redimensionável aqui.
      if (!OBJECT_CATALOG[key].resizable) expect(caps.resize).toBe('none')
    }
  })
})
