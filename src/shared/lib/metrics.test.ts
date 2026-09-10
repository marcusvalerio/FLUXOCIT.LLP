import { describe, expect, it } from 'vitest'
import { computeProjectMetrics } from './metrics'
import type { LayoutObject } from '../../types/layout'
import type { FlowNode } from '../../types/flow'

function obj(partial: Partial<LayoutObject>): LayoutObject {
  return {
    id: 'x',
    objectType: 'wall',
    category: 'structure',
    x: 0,
    y: 0,
    width: 100,
    length: 100,
    rotationDeg: 0,
    zIndex: 0,
    properties: {},
    ...partial,
  }
}

describe('computeProjectMetrics', () => {
  it('computes area total from environment dimensions', () => {
    const m = computeProjectMetrics([], [], 20, 15)
    expect(m.areaTotalM2).toBe(300)
  })

  it('sums storage footprint into areaArmazenagemM2', () => {
    const objects = [
      obj({ id: 'r1', objectType: 'rack', category: 'storage', width: 270, length: 110 }),
      obj({ id: 's1', objectType: 'shelf', category: 'storage', width: 100, length: 40 }),
    ]
    const m = computeProjectMetrics(objects, [], 20, 15)
    expect(m.areaArmazenagemM2).toBeCloseTo((270 * 110 + 100 * 40) / 10000, 5)
  })

  it('counts equipment and sums their footprint as areaOperacionalM2', () => {
    const objects = [
      obj({ id: 'f1', objectType: 'forklift', category: 'equipment', width: 120, length: 230 }),
      obj({ id: 'f2', objectType: 'pallet-jack', category: 'equipment', width: 68, length: 150 }),
    ]
    const m = computeProjectMetrics(objects, [], 20, 15)
    expect(m.qtdEquipamentos).toBe(2)
    expect(m.areaOperacionalM2).toBeCloseTo((120 * 230 + 68 * 150) / 10000, 5)
  })

  it('computes rack capacity as bays x levels, summed across racks', () => {
    const objects = [
      obj({ id: 'r1', objectType: 'rack', category: 'storage', properties: { bays: 3, levels: 4 } }),
      obj({ id: 'r2', objectType: 'rack', category: 'storage', properties: { bays: 2, levels: 3 } }),
    ]
    const m = computeProjectMetrics(objects, [], 20, 15)
    expect(m.posicoesPallet).toBe(3 * 4 + 2 * 3)
  })

  it('counts docks and corridor length', () => {
    const objects = [
      obj({ id: 'd1', objectType: 'dock', category: 'structure' }),
      obj({ id: 'd2', objectType: 'dock', category: 'structure' }),
      obj({ id: 'c1', objectType: 'corridor', category: 'storage', width: 300, length: 150 }),
    ]
    const m = computeProjectMetrics(objects, [], 20, 15)
    expect(m.qtdDocas).toBe(2)
    expect(m.comprimentoCorredoresM).toBeCloseTo(3, 5) // max(300,150)/100
  })

  it('counts area-like objects regardless of exact objectType', () => {
    const objects = [
      obj({ id: 'a1', objectType: 'area', category: 'area' }),
      obj({ id: 'a2', objectType: 'area-picking', category: 'storage' }),
      obj({ id: 'a3', objectType: 'area-shipping', category: 'area' }),
    ]
    const m = computeProjectMetrics(objects, [], 20, 15)
    expect(m.qtdAreas).toBe(3)
  })

  it('counts flow steps from flowNodes length', () => {
    const flowNodes: FlowNode[] = [
      { id: 'n1', type: 'receiving', x: 0, y: 0 },
      { id: 'n2', type: 'storage', x: 0, y: 0 },
    ]
    const m = computeProjectMetrics([], flowNodes, 20, 15)
    expect(m.qtdEtapasFluxo).toBe(2)
  })
})

describe('métricas derivadas do modelo operacional', () => {
  const areaA: LayoutObject = {
    id: 'area-a', objectType: 'area', category: 'area', x: 0, y: 0,
    width: 400, length: 400, rotationDeg: 0, zIndex: 0, properties: {},
  }
  const areaB: LayoutObject = { ...areaA, id: 'area-b', x: 3000, y: 0 }

  const nodes = [
    { id: 'n1', type: 'receiving' as const, x: 0, y: 0, linkedObjectId: 'area-a', capacity: 20, capacityUnit: 'pallets/h' as const },
    { id: 'n2', type: 'shipping' as const, x: 400, y: 0, linkedObjectId: 'area-b', capacity: 8, capacityUnit: 'pallets/h' as const },
  ]
  const connections = [{ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2', flowType: 'pallet' as const }]

  it('conta conexões e etapas isoladas', () => {
    const solta = { id: 'n3', type: 'picking' as const, x: 0, y: 0 }
    const m = computeProjectMetrics([], [...nodes, solta], 40, 25, connections)
    expect(m.qtdConexoesFluxo).toBe(1)
    expect(m.qtdEtapasIsoladas).toBe(1)
  })

  it('mede a distância do fluxo entre as áreas vinculadas', () => {
    const m = computeProjectMetrics([areaA, areaB], nodes, 40, 25, connections)
    expect(m.distanciaFluxoM).toBe(30)
  })

  it('não inventa distância quando as etapas não estão vinculadas a áreas', () => {
    const semVinculo = nodes.map((n) => ({ ...n, linkedObjectId: undefined }))
    const m = computeProjectMetrics([areaA, areaB], semVinculo, 40, 25, connections)
    expect(m.distanciaFluxoM).toBeUndefined()
  })

  it('reporta a capacidade da etapa mais restritiva', () => {
    const m = computeProjectMetrics([], nodes, 40, 25, connections)
    expect(m.capacidadeGargalo).toEqual({ valor: 8, unidade: 'pallets/h' })
  })

  it('não afirma gargalo com uma única etapa comparável', () => {
    const m = computeProjectMetrics([], [nodes[0]!], 40, 25, [])
    expect(m.capacidadeGargalo).toBeUndefined()
  })

  it('ignora capacidade de estoque ao estimar o gargalo de vazão', () => {
    const estoque = [
      { ...nodes[0]!, capacityUnit: 'posições' as const, capacity: 500 },
      { ...nodes[1]!, capacityUnit: 'pallets' as const, capacity: 30 },
    ]
    const m = computeProjectMetrics([], estoque, 40, 25, connections)
    expect(m.capacidadeGargalo).toBeUndefined()
  })
})
