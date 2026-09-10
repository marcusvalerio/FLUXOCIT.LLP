import { describe, expect, it } from 'vitest'
import { analyzeProject, summarizeInsights, type AnalysisContext } from './index'
import type { LayoutObject } from '../../../types/layout'
import type { FlowConnection, FlowNode } from '../../../types/flow'

function context(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return { objects: [], flowNodes: [], flowConnections: [], envWidthM: 40, envHeightM: 25, ...overrides }
}

function node(id: string, type: FlowNode['type'], extra: Partial<FlowNode> = {}): FlowNode {
  return { id, type, x: 0, y: 0, ...extra }
}

function connection(id: string, fromNodeId: string, toNodeId: string): FlowConnection {
  return { id, fromNodeId, toNodeId, flowType: 'material' }
}

function area(id: string, x: number, y: number): LayoutObject {
  return {
    id,
    objectType: 'area',
    category: 'area',
    x,
    y,
    width: 400,
    length: 400,
    rotationDeg: 0,
    zIndex: 0,
    properties: {},
  }
}

const ruleIds = (ctx: AnalysisContext) => analyzeProject(ctx).map((i) => i.ruleId)

describe('Intelligence — determinismo e forma', () => {
  it('projeto vazio não gera ruído', () => {
    expect(analyzeProject(context())).toEqual([])
  })

  it('a mesma entrada produz exatamente a mesma saída', () => {
    const ctx = context({
      flowNodes: [node('a', 'receiving'), node('b', 'picking'), node('c', 'shipping')],
      flowConnections: [connection('c1', 'a', 'b')],
    })
    expect(analyzeProject(ctx)).toEqual(analyzeProject(ctx))
  })

  it('todo insight se explica: regra, descrição e recomendação', () => {
    const insights = analyzeProject(
      context({ flowNodes: [node('a', 'receiving'), node('b', 'picking')] }),
    )
    expect(insights.length).toBeGreaterThan(0)
    for (const insight of insights) {
      expect(insight.id).toBeTruthy()
      expect(insight.ruleId).toMatch(/^(layout|flow|integration)\//)
      expect(insight.title.length).toBeGreaterThan(0)
      expect(insight.description.length).toBeGreaterThan(0)
      expect(insight.recommendation.length).toBeGreaterThan(0)
      expect(['info', 'warning', 'critical']).toContain(insight.severity)
    }
  })

  it('ordena por severidade: crítico primeiro', () => {
    const insights = analyzeProject(
      context({
        // Referência quebrada (crítico) + etapa isolada (atenção) + sem capacidade (info)
        flowNodes: [node('a', 'receiving', { linkedObjectId: 'nao-existe' }), node('b', 'picking')],
      }),
    )
    const severities = insights.map((i) => i.severity)
    expect(severities[0]).toBe('critical')
    expect(severities).toEqual([...severities].sort((a, b) =>
      ({ critical: 0, warning: 1, info: 2 })[a] - ({ critical: 0, warning: 1, info: 2 })[b],
    ))
  })
})

describe('Intelligence — regras de Fluxo', () => {
  it('aponta etapa isolada', () => {
    const ctx = context({
      flowNodes: [node('a', 'receiving'), node('b', 'shipping'), node('sozinha', 'picking')],
      flowConnections: [connection('c1', 'a', 'b')],
    })
    const isolated = analyzeProject(ctx).filter((i) => i.ruleId === 'flow/isolated-node')
    expect(isolated).toHaveLength(1)
    expect(isolated[0]!.targets.flowNodeIds).toEqual(['sozinha'])
  })

  it('não reclama de origem faltando em recebimento nem de destino em expedição', () => {
    const ctx = context({
      flowNodes: [node('a', 'receiving'), node('b', 'shipping')],
      flowConnections: [connection('c1', 'a', 'b')],
    })
    expect(ruleIds(ctx)).not.toContain('flow/no-inbound')
    expect(ruleIds(ctx)).not.toContain('flow/no-outbound')
  })

  it('aponta etapa sem origem e sem destino quando não é entrada/saída natural', () => {
    const ctx = context({
      flowNodes: [node('a', 'receiving'), node('meio', 'picking'), node('fim', 'staging')],
      flowConnections: [connection('c1', 'a', 'meio'), connection('c2', 'meio', 'fim')],
    })
    const rules = ruleIds(ctx)
    expect(rules).toContain('flow/no-outbound') // staging não é saída natural
  })

  it('detecta ciclo e nomeia as etapas envolvidas', () => {
    const ctx = context({
      flowNodes: [node('a', 'receiving'), node('b', 'picking'), node('c', 'staging')],
      flowConnections: [connection('c1', 'a', 'b'), connection('c2', 'b', 'c'), connection('c3', 'c', 'b')],
    })
    const cycle = analyzeProject(ctx).find((i) => i.ruleId === 'flow/cycle')
    expect(cycle).toBeDefined()
    expect(cycle!.targets.flowNodeIds).toEqual(['b', 'c'])
  })

  it('não inventa ciclo num fluxo linear', () => {
    const ctx = context({
      flowNodes: [node('a', 'receiving'), node('b', 'picking'), node('c', 'shipping')],
      flowConnections: [connection('c1', 'a', 'b'), connection('c2', 'b', 'c')],
    })
    expect(ruleIds(ctx)).not.toContain('flow/cycle')
  })

  it('aponta gargalo quando a etapa seguinte processa menos', () => {
    const ctx = context({
      flowNodes: [
        node('a', 'receiving', { capacity: 20, capacityUnit: 'pallets/h' }),
        node('b', 'shipping', { capacity: 8, capacityUnit: 'pallets/h' }),
      ],
      flowConnections: [connection('c1', 'a', 'b')],
    })
    const bottleneck = analyzeProject(ctx).find((i) => i.ruleId === 'flow/bottleneck')
    expect(bottleneck).toBeDefined()
    expect(bottleneck!.severity).toBe('warning') // 60% a menos
    expect(bottleneck!.description).toContain('60%')
  })

  it('não compara capacidades em unidades diferentes', () => {
    const ctx = context({
      flowNodes: [
        node('a', 'receiving', { capacity: 20, capacityUnit: 'pallets/h' }),
        node('b', 'picking', { capacity: 8, capacityUnit: 'pedidos/h' }),
      ],
      flowConnections: [connection('c1', 'a', 'b')],
    })
    expect(ruleIds(ctx)).not.toContain('flow/bottleneck')
  })

  it('só cobra capacidade de quem tem capacidade a declarar', () => {
    const ctx = context({ flowNodes: [node('adm', 'administrative'), node('rec', 'receiving')] })
    const missing = analyzeProject(ctx).filter((i) => i.ruleId === 'flow/missing-capacity')
    expect(missing.map((i) => i.targets.flowNodeIds?.[0])).toEqual(['rec'])
  })
})

describe('Intelligence — integração Layout × Fluxo', () => {
  it('marca como crítico o vínculo com área inexistente', () => {
    const ctx = context({
      objects: [area('area-1', 0, 0)],
      flowNodes: [node('a', 'receiving', { linkedObjectId: 'apagada' })],
    })
    const broken = analyzeProject(ctx).find((i) => i.ruleId === 'integration/broken-link')
    expect(broken?.severity).toBe('critical')
  })

  it('aponta percurso longo entre etapas ligadas a áreas distantes', () => {
    const ctx = context({
      envWidthM: 200,
      envHeightM: 100,
      objects: [area('perto', 0, 0), area('longe', 9000, 0)],
      flowNodes: [
        node('a', 'receiving', { linkedObjectId: 'perto' }),
        node('b', 'shipping', { linkedObjectId: 'longe' }),
      ],
      flowConnections: [connection('c1', 'a', 'b')],
    })
    const long = analyzeProject(ctx).find((i) => i.ruleId === 'integration/long-transfer')
    expect(long).toBeDefined()
    expect(long!.description).toContain('90.0 m')
  })

  it('não aponta percurso longo quando as áreas estão próximas', () => {
    const ctx = context({
      objects: [area('a1', 0, 0), area('a2', 500, 0)],
      flowNodes: [
        node('a', 'receiving', { linkedObjectId: 'a1' }),
        node('b', 'shipping', { linkedObjectId: 'a2' }),
      ],
      flowConnections: [connection('c1', 'a', 'b')],
    })
    expect(ruleIds(ctx)).not.toContain('integration/long-transfer')
  })

  it('avisa quando as duas camadas existem mas não se falam', () => {
    const ctx = context({
      objects: [area('a1', 0, 0)],
      flowNodes: [node('a', 'receiving'), node('b', 'shipping')],
      flowConnections: [connection('c1', 'a', 'b')],
    })
    expect(ruleIds(ctx)).toContain('integration/unlinked-flow')
  })
})

describe('Intelligence — regras de Layout', () => {
  it('reaproveita as regras espaciais existentes, com recomendação', () => {
    const fora: LayoutObject = { ...area('fora', 100000, 100000) }
    const insights = analyzeProject(context({ objects: [fora] }))
    const espacial = insights.find((i) => i.domain === 'layout' && i.ruleId.startsWith('layout/out-of-bounds'))
    expect(espacial).toBeDefined()
    expect(espacial!.recommendation).toContain('limites do ambiente')
  })

  it('aponta ocupação elevada', () => {
    const lotado: LayoutObject = {
      id: 'bloco',
      objectType: 'storage-block',
      category: 'storage',
      x: 0,
      y: 0,
      width: 3900,
      length: 2400,
      rotationDeg: 0,
      zIndex: 0,
      properties: {},
    }
    const insight = analyzeProject(context({ objects: [lotado] })).find(
      (i) => i.ruleId === 'layout/occupancy-high',
    )
    expect(insight?.severity).toBe('warning')
  })

  it('aponta área subutilizada', () => {
    const pequeno: LayoutObject = {
      id: 'p',
      objectType: 'pallet',
      category: 'pallet',
      x: 0,
      y: 0,
      width: 120,
      length: 100,
      rotationDeg: 0,
      zIndex: 0,
      properties: {},
    }
    expect(ruleIds(context({ objects: [pequeno] }))).toContain('layout/occupancy-low')
  })
})

describe('resumo', () => {
  it('conta por severidade', () => {
    const insights = analyzeProject(
      context({ flowNodes: [node('a', 'receiving', { linkedObjectId: 'x' }), node('b', 'picking')] }),
    )
    const summary = summarizeInsights(insights)
    expect(summary.total).toBe(insights.length)
    expect(summary.critical + summary.warning + summary.info).toBe(summary.total)
  })
})
