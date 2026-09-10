import { describe, expect, it } from 'vitest'
import { getAllObjectProfiles, getObjectProfile } from './registry'
import { getObjectRole } from './roles'
import { OBJECT_CATALOG } from './catalog'
import type { ObjectTypeKey } from '../../../types/layout'

describe('registry de objetos', () => {
  it('descreve o objeto por inteiro num lugar só', () => {
    const rack = getObjectProfile('rack')
    expect(rack.label).toBe('Porta-paletes')
    expect(rack.description).toBe('Armazenagem paletizada')
    expect(rack.role).toBe('storage')
    expect(rack.capabilities.resize).toBe('both')
    expect(rack.defaultWidth).toBe(OBJECT_CATALOG.rack.defaultWidth)
    expect(rack.propertyFields).toBe(OBJECT_CATALOG.rack.propertyFields)
    expect(rack.render).toBe(OBJECT_CATALOG.rack.render)
  })

  it('todo tipo do catálogo tem perfil completo e coerente', () => {
    const profiles = getAllObjectProfiles()
    expect(profiles).toHaveLength(Object.keys(OBJECT_CATALOG).length)

    for (const profile of profiles) {
      expect(profile.label.length).toBeGreaterThan(0)
      expect(profile.description.length).toBeGreaterThan(0)
      expect(profile.defaultWidth).toBeGreaterThan(0)
      expect(profile.defaultLength).toBeGreaterThan(0)
      expect(profile.minSizeCm).toBeGreaterThan(0)
      expect(profile.maxSizeCm).toBeGreaterThan(profile.minSizeCm)
      // Um objeto que não redimensiona no catálogo não pode aparecer redimensionável aqui.
      if (!OBJECT_CATALOG[profile.key].resizable) expect(profile.capabilities.resize).toBe('none')
    }
  })

  it('elementos lineares podem ser finos; os demais têm piso maior', () => {
    expect(getObjectProfile('wall').minSizeCm).toBeLessThan(getObjectProfile('rack').minSizeCm)
    expect(getObjectProfile('corridor').minSizeCm).toBe(getObjectProfile('wall').minSizeCm)
  })
})

describe('papéis logísticos', () => {
  it('classifica cada família pelo comportamento, não pela categoria da biblioteca', () => {
    expect(getObjectRole('wall')).toBe('linear')
    expect(getObjectRole('corridor')).toBe('circulation')
    expect(getObjectRole('rack')).toBe('storage')
    expect(getObjectRole('pallet')).toBe('unit-load')
    expect(getObjectRole('forklift')).toBe('mobile-equipment')
    expect(getObjectRole('area-picking')).toBe('area')
    expect(getObjectRole('column')).toBe('structure')
  })

  it('todo tipo do catálogo recebe exatamente um papel válido', () => {
    const valid = ['linear', 'circulation', 'storage', 'unit-load', 'mobile-equipment', 'area', 'structure']
    for (const key of Object.keys(OBJECT_CATALOG) as ObjectTypeKey[]) {
      expect(valid).toContain(getObjectRole(key))
    }
  })
})
