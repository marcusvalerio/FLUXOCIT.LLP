import { describe, expect, it } from 'vitest'
import { DEMO_PROJECT, buildDemoFlow, buildDemoObjects } from './demoProject'
import { analyzeProject } from '../lib/intelligence'
import { OBJECT_CATALOG } from '../../features/editor/objects/catalog'

const objects = buildDemoObjects()
const { flowNodes, flowConnections } = buildDemoFlow()

describe('projeto demonstrativo', () => {
  it('usa só tipos do catálogo, com a categoria certa e ids únicos', () => {
    for (const o of objects) {
      expect(OBJECT_CATALOG[o.objectType], o.id).toBeDefined()
      expect(o.category, o.id).toBe(OBJECT_CATALOG[o.objectType].category)
    }
    expect(new Set(objects.map((o) => o.id)).size).toBe(objects.length)
  })

  it('não dispara alertas da Análise (sobreposição, corredor bloqueado/estreito, fora do ambiente…)', () => {
    const insights = analyzeProject({ objects, flowNodes, flowConnections, envWidthM: DEMO_PROJECT.widthM, envHeightM: DEMO_PROJECT.heightM })
    expect(insights.map((i) => `${i.ruleId}: ${i.title}`)).toEqual([])
  })

  it('vias de pedestres com pelo menos 1,20 m (NR-12, 12.2.1)', () => {
    for (const o of objects.filter((o) => o.objectType === 'pedestrian-lane')) {
      expect(Math.min(o.width, o.length), o.id).toBeGreaterThanOrEqual(120)
    }
  })

  it('o Fluxo só liga etapas vinculadas a objetos existentes', () => {
    const ids = new Set(objects.map((o) => o.id))
    for (const n of flowNodes) expect(ids.has(n.linkedObjectId!), n.id).toBe(true)
    const nodeIds = new Set(flowNodes.map((n) => n.id))
    for (const c of flowConnections) expect(nodeIds.has(c.fromNodeId) && nodeIds.has(c.toNodeId)).toBe(true)
  })
})
