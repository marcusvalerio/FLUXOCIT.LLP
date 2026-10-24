import { describe, expect, it } from 'vitest'
import {
  computeOccupancyPercent,
  computeSpatialViolations,
  findBlockedCorridors,
  findBlockedDocks,
  findEquipmentStructureConflicts,
  findNarrowCorridors,
  findOverlappingOperationalAreas,
  findStorageOverlaps,
  getBoundsStatus,
  getRecommendedCorridorWidthCm,
} from './spatialRules'
import type { LayoutObject } from '../../types/layout'

function makeObject(overrides: Partial<LayoutObject> = {}): LayoutObject {
  return {
    id: overrides.id ?? '1',
    objectType: 'rack',
    category: 'storage',
    x: 0,
    y: 0,
    width: 270,
    length: 110,
    rotationDeg: 0,
    zIndex: 0,
    properties: {},
    ...overrides,
  }
}

describe('findStorageOverlaps', () => {
  it('flags two racks whose footprints genuinely overlap', () => {
    const a = makeObject({ id: 'a', x: 0, y: 0 })
    const b = makeObject({ id: 'b', x: 100, y: 0 }) // overlaps a (a spans x:0-270)
    expect(findStorageOverlaps([a, b])).toEqual(new Set(['a', 'b']))
  })

  it('does not flag racks placed edge-to-edge with no real overlap', () => {
    const a = makeObject({ id: 'a', x: 0, y: 0 })
    const b = makeObject({ id: 'b', x: 270, y: 0 }) // touches a's right edge exactly
    expect(findStorageOverlaps([a, b])).toEqual(new Set())
  })

  it('does not flag racks that are simply near each other', () => {
    const a = makeObject({ id: 'a', x: 0, y: 0 })
    const b = makeObject({ id: 'b', x: 400, y: 400 })
    expect(findStorageOverlaps([a, b])).toEqual(new Set())
  })

  it('ignores overlap with non-storage types (e.g. a dock deliberately on a wall)', () => {
    const wall = makeObject({ id: 'wall', objectType: 'wall', category: 'structure', x: 0, y: 0, width: 300, length: 20 })
    const dock = makeObject({ id: 'dock', objectType: 'dock', category: 'structure', x: 0, y: 0, width: 300, length: 50 })
    expect(findStorageOverlaps([wall, dock])).toEqual(new Set())
  })

  it('flags a corridor overlapped by a rack', () => {
    const corridor = makeObject({ id: 'c', objectType: 'corridor', category: 'storage', x: 0, y: 0, width: 300, length: 150 })
    const rack = makeObject({ id: 'r', x: 50, y: 50 })
    expect(findStorageOverlaps([corridor, rack])).toEqual(new Set(['c', 'r']))
  })

  it('accounts for rotation via the bounding box', () => {
    // a 270x110 rack rotated 90deg occupies a 110x270 footprint centered the same place
    const a = makeObject({ id: 'a', x: 0, y: 0, rotationDeg: 90 })
    const b = makeObject({ id: 'b', x: 90, y: -50 })
    expect(findStorageOverlaps([a, b]).size).toBeGreaterThan(0)
  })
})

describe('computeOccupancyPercent', () => {
  it('computes the percentage of environment area covered by solid objects', () => {
    // env 1000x1000cm (10x10m = 100m² = 1,000,000 cm²); one rack 270x110cm = 29,700 cm²
    const rack = makeObject({ id: 'r', x: 0, y: 0, width: 270, length: 110 })
    const pct = computeOccupancyPercent([rack], 1000, 1000)
    expect(pct).toBeCloseTo((270 * 110 * 100) / (1000 * 1000), 5)
  })

  it('excludes areas and flow routes (zones/markers, not physical footprint)', () => {
    const area = makeObject({ id: 'a', objectType: 'area', category: 'area', width: 500, length: 500 })
    const flow = makeObject({ id: 'f', objectType: 'flow-route', category: 'flow', width: 500, length: 20 })
    expect(computeOccupancyPercent([area, flow], 1000, 1000)).toBe(0)
  })

  it('returns 0 for an environment with no area', () => {
    const rack = makeObject({ id: 'r' })
    expect(computeOccupancyPercent([rack], 0, 1000)).toBe(0)
  })
})

describe('getBoundsStatus', () => {
  const envWidthCm = 1000
  const envHeightCm = 1000

  it('is inside when the whole footprint fits within the environment', () => {
    const obj = makeObject({ x: 100, y: 100, width: 270, length: 110 })
    expect(getBoundsStatus(obj, envWidthCm, envHeightCm)).toBe('inside')
  })

  it('is partial when the footprint straddles an edge', () => {
    const obj = makeObject({ x: 950, y: 100, width: 270, length: 110 }) // right edge at 1220 > 1000
    expect(getBoundsStatus(obj, envWidthCm, envHeightCm)).toBe('partial')
  })

  it('is outside when the footprint has no overlap with the environment at all', () => {
    const obj = makeObject({ x: 2000, y: 100, width: 270, length: 110 })
    expect(getBoundsStatus(obj, envWidthCm, envHeightCm)).toBe('outside')
  })

  it('is outside for negative coordinates entirely past the top-left corner', () => {
    const obj = makeObject({ x: -500, y: -500, width: 270, length: 110 })
    expect(getBoundsStatus(obj, envWidthCm, envHeightCm)).toBe('outside')
  })

  it('treats an object exactly flush with the edges as inside', () => {
    const obj = makeObject({ x: 0, y: 0, width: 1000, length: 1000 })
    expect(getBoundsStatus(obj, envWidthCm, envHeightCm)).toBe('inside')
  })
})

describe('getRecommendedCorridorWidthCm', () => {
  it('returns the reference width for a known corridor type', () => {
    expect(getRecommendedCorridorWidthCm('forklift')).toBe(320)
    expect(getRecommendedCorridorWidthCm('pedestrian')).toBe(120)
  })

  it('falls back to a generic figure for an unset/unrecognized type', () => {
    expect(getRecommendedCorridorWidthCm(undefined)).toBeGreaterThan(0)
    expect(getRecommendedCorridorWidthCm('unknown-type')).toBeGreaterThan(0)
  })
})

describe('findBlockedCorridors', () => {
  it('flags a rack invading a corridor', () => {
    const corridor = makeObject({ id: 'c', objectType: 'corridor', category: 'storage', x: 0, y: 0, width: 300, length: 150, properties: { code: 'C03' } })
    const rack = makeObject({ id: 'r', x: 50, y: 50 })
    const violations = findBlockedCorridors([corridor, rack])
    expect(violations).toHaveLength(1)
    expect(violations[0].severity).toBe('critical')
    expect(violations[0].message).toContain('C03')
  })

  it('does not flag two corridors overlapping each other (only intruders)', () => {
    const a = makeObject({ id: 'a', objectType: 'corridor', category: 'storage', x: 0, y: 0, width: 300, length: 150 })
    const b = makeObject({ id: 'b', objectType: 'corridor', category: 'storage', x: 50, y: 50, width: 300, length: 150 })
    expect(findBlockedCorridors([a, b])).toEqual([])
  })

  it('does not flag a corridor with nothing overlapping it', () => {
    const corridor = makeObject({ id: 'c', objectType: 'corridor', category: 'storage', x: 0, y: 0, width: 300, length: 150 })
    const rack = makeObject({ id: 'r', x: 1000, y: 1000 })
    expect(findBlockedCorridors([corridor, rack])).toEqual([])
  })
})

describe('findNarrowCorridors', () => {
  it('flags a corridor narrower than its type recommends', () => {
    const corridor = makeObject({
      id: 'c',
      objectType: 'corridor',
      category: 'storage',
      width: 300,
      length: 100,
      properties: { corridorType: 'forklift' },
    })
    const violations = findNarrowCorridors([corridor])
    expect(violations).toHaveLength(1)
    expect(violations[0].severity).toBe('warning')
  })

  it('does not flag a corridor at or above the recommended width', () => {
    const corridor = makeObject({
      id: 'c',
      objectType: 'corridor',
      category: 'storage',
      width: 300,
      length: 120,
      properties: { corridorType: 'pedestrian' },
    })
    expect(findNarrowCorridors([corridor])).toEqual([])
  })

  it('flags a pedestrian route under 1,20 m (NR-12, 12.2.1)', () => {
    const corridor = makeObject({
      id: 'c',
      objectType: 'corridor',
      category: 'storage',
      width: 300,
      length: 100,
      properties: { corridorType: 'pedestrian' },
    })
    expect(findNarrowCorridors([corridor]).map((v) => v.code)).toEqual(['corridor-narrow'])
  })
})

describe('findEquipmentStructureConflicts', () => {
  it('flags a forklift overlapping a wall', () => {
    const wall = makeObject({ id: 'w', objectType: 'wall', category: 'structure', x: 0, y: 0, width: 300, length: 20 })
    const forklift = makeObject({ id: 'f', objectType: 'forklift', category: 'equipment', x: 50, y: 0, width: 120, length: 230 })
    const violations = findEquipmentStructureConflicts([wall, forklift])
    expect(violations).toHaveLength(1)
    expect(violations[0].severity).toBe('critical')
  })

  it('does not flag equipment overlapping a door (a deliberate opening)', () => {
    const door = makeObject({ id: 'd', objectType: 'door', category: 'structure', x: 0, y: 0, width: 100, length: 20 })
    const forklift = makeObject({ id: 'f', objectType: 'forklift', category: 'equipment', x: 0, y: 0, width: 120, length: 230 })
    expect(findEquipmentStructureConflicts([door, forklift])).toEqual([])
  })
})

describe('findOverlappingOperationalAreas', () => {
  it('flags two overlapping areas', () => {
    const a = makeObject({ id: 'a', objectType: 'area', category: 'area', x: 0, y: 0, width: 400, length: 400 })
    const b = makeObject({ id: 'b', objectType: 'area-shipping', category: 'area', x: 100, y: 100, width: 400, length: 400 })
    const violations = findOverlappingOperationalAreas([a, b])
    expect(violations).toHaveLength(1)
    expect(violations[0].severity).toBe('warning')
  })

  it('does not flag areas that do not overlap', () => {
    const a = makeObject({ id: 'a', objectType: 'area', category: 'area', x: 0, y: 0, width: 400, length: 400 })
    const b = makeObject({ id: 'b', objectType: 'area-shipping', category: 'area', x: 1000, y: 1000, width: 400, length: 400 })
    expect(findOverlappingOperationalAreas([a, b])).toEqual([])
  })
})

describe('findBlockedDocks', () => {
  it('flags a dock mostly covered by another object as critical', () => {
    const dock = makeObject({ id: 'd', objectType: 'dock', category: 'structure', x: 0, y: 0, width: 350, length: 50, properties: { code: 'D02' } })
    const rack = makeObject({ id: 'r', x: 0, y: 0, width: 350, length: 50 })
    const violations = findBlockedDocks([dock, rack])
    expect(violations).toHaveLength(1)
    expect(violations[0].severity).toBe('critical')
    expect(violations[0].message).toContain('D02')
  })

  it('flags a dock partly covered as a warning', () => {
    const dock = makeObject({ id: 'd', objectType: 'dock', category: 'structure', x: 0, y: 0, width: 350, length: 50, properties: { code: 'D02' } })
    const cart = makeObject({ id: 'c', objectType: 'platform-cart', category: 'equipment', x: 320, y: 0, width: 80, length: 50 })
    const violations = findBlockedDocks([dock, cart])
    expect(violations).toHaveLength(1)
    expect(violations[0].severity).toBe('warning')
    expect(violations[0].message).toContain('parcialmente')
  })

  it('does not flag an unobstructed dock', () => {
    const dock = makeObject({ id: 'd', objectType: 'dock', category: 'structure', x: 0, y: 0, width: 350, length: 50 })
    const rack = makeObject({ id: 'r', x: 1000, y: 1000 })
    expect(findBlockedDocks([dock, rack])).toEqual([])
  })
})

describe('computeSpatialViolations', () => {
  it('aggregates violations from every rule', () => {
    const corridor = makeObject({ id: 'c', objectType: 'corridor', category: 'storage', x: 0, y: 0, width: 300, length: 150 })
    const rack = makeObject({ id: 'r', x: 50, y: 50 })
    const violations = computeSpatialViolations([corridor, rack], 1000, 1000)
    expect(violations.some((v) => v.code === 'corridor-blocked')).toBe(true)
  })

  it('returns no violations for a clean, empty layout', () => {
    expect(computeSpatialViolations([], 1000, 1000)).toEqual([])
  })
})
