import { describe, expect, it } from 'vitest'
import { computeSafetyChecks, maxDistanceToExtinguisher, overallSafetyStatus } from './safety'
import type { LayoutObject, ObjectCategory, ObjectTypeKey } from '../../types/layout'

function o(id: string, objectType: ObjectTypeKey, category: ObjectCategory, x: number, y: number, width: number, length: number, properties = {}): LayoutObject {
  return { id, objectType, category, x, y, width, length, rotationDeg: 0, zIndex: 0, properties }
}
const byId = (checks: ReturnType<typeof computeSafetyChecks>) => Object.fromEntries(checks.map((c) => [c.id, c.status]))

describe('verificações de segurança', () => {
  it('layout vazio fica pendente, sem alarme', () => {
    const checks = computeSafetyChecks([], 20, 10)
    expect(overallSafetyStatus(checks)).toBe('pending')
  })

  it('via de pedestres abaixo de 1,20 m pede atenção', () => {
    const s = byId(computeSafetyChecks([o('p', 'pedestrian-lane', 'flow', 0, 0, 1000, 100)], 20, 10))
    expect(s['pedestrian-routes']).toBe('attention')
    const ok = byId(computeSafetyChecks([o('p', 'pedestrian-lane', 'flow', 0, 0, 1000, 120)], 20, 10))
    expect(ok['pedestrian-routes']).toBe('ok')
  })

  it('cobertura de extintores pela maior distância até o mais próximo', () => {
    const one = [o('e', 'fire-extinguisher', 'safety', 965, 465, 70, 70)]   // centro em (10, 5) num ambiente 20 × 10
    expect(maxDistanceToExtinguisher(one, 20, 10)).toBeCloseTo(Math.hypot(9.75, 4.75), 1)
    expect(byId(computeSafetyChecks(one, 20, 10)).extinguishers).toBe('ok')
    expect(byId(computeSafetyChecks(one, 60, 10)).extinguishers).toBe('attention')
    expect(byId(computeSafetyChecks([o('r', 'rack', 'storage', 0, 0, 270, 110)], 20, 10)).extinguishers).toBe('attention')
  })

  it('doca sem zona de manobra e máquinas sem lava-olhos pedem atenção', () => {
    const objects = [o('d', 'dock', 'structure', 0, 950, 350, 50), o('f', 'forklift', 'equipment', 500, 500, 120, 230)]
    const s = byId(computeSafetyChecks(objects, 20, 10))
    expect(s['dock-zones']).toBe('attention')
    expect(s.eyewash).toBe('attention')
    expect(s['forklift-aisles']).toBe('attention')
    const fixed = byId(computeSafetyChecks([...objects, o('z', 'safety-zone', 'flow', 0, 800, 350, 140), o('w', 'eyewash', 'safety', 800, 100, 70, 70)], 20, 10))
    expect(fixed['dock-zones']).toBe('ok')
    expect(fixed.eyewash).toBe('ok')
  })
})
