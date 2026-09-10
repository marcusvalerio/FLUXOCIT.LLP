import { getCenter } from './geometry'
import type { LayoutObject } from '../../types/layout'
import type { FlowConnection, FlowNode } from '../../types/flow'

export interface ProjectMetrics {
  areaTotalM2: number
  areaArmazenagemM2: number
  areaOperacionalM2: number
  areaCirculacaoM2: number
  /** Só de porta-paletes: é o único tipo que declara vãos **e** níveis. Estante, drive-in,
   * push-back e flow rack declaram apenas níveis, e derivar posições deles exigiria inventar um
   * número de vãos — preferimos subestimar a inventar. */
  posicoesPallet: number
  qtdEquipamentos: number
  qtdDocas: number
  /** Apenas objetos do tipo corredor; faixas de tráfego e de pedestres contam como circulação
   * na área, mas não como corredor logístico. */
  comprimentoCorredoresM: number
  qtdAreas: number
  qtdEtapasFluxo: number

  // --- Derivadas do modelo operacional. `undefined` quando não há dado suficiente: uma métrica
  // ausente é informação; uma métrica inventada é ruído. ---

  qtdConexoesFluxo: number
  /** Etapas sem nenhuma conexão de entrada ou saída. */
  qtdEtapasIsoladas: number
  /**
   * Soma das distâncias entre as áreas vinculadas de etapas conectadas — o deslocamento que a
   * operação percorre por ciclo, medido no espaço real. `undefined` quando nenhuma conexão tem
   * as duas pontas vinculadas a objetos do Layout.
   */
  distanciaFluxoM?: number
  /**
   * Capacidade da etapa mais restritiva entre as que declaram vazão na mesma unidade — o teto
   * do fluxo. `undefined` quando não há etapas comparáveis o bastante para afirmar isso.
   */
  capacidadeGargalo?: { valor: number; unidade: string }
}

/** Exported for reuse by spatialRules.ts (e.g. "área operacional sobreposta" / corridor-blocking
 * checks need the same type groupings as the metrics they're derived from). */
export const CIRCULATION_TYPES = new Set(['corridor', 'traffic-lane', 'pedestrian-lane', 'intersection'])
export const AREA_TYPES = new Set([
  'area',
  'area-picking',
  'area-staging',
  'area-inspection',
  'area-shipping',
  'area-receiving',
])

function footprintM2(o: LayoutObject): number {
  return (o.width * o.length) / 10000
}

/** Aggregate indicators for the whole project (Layout + Fluxo) — see docs/BUSINESS_RULES.md §
 * Métricas (P8/Fase 5). Sums are directional estimates from bounding footprint, same caveat as
 * computeOccupancyPercent: overlapping objects (e.g. a pallet inside a rack) are double-counted. */
export function computeProjectMetrics(
  objects: LayoutObject[],
  flowNodes: FlowNode[],
  envWidthM: number,
  envHeightM: number,
  flowConnections: FlowConnection[] = [],
): ProjectMetrics {
  let areaArmazenagemM2 = 0
  let areaOperacionalM2 = 0
  let areaCirculacaoM2 = 0
  let posicoesPallet = 0
  let qtdEquipamentos = 0
  let qtdDocas = 0
  let comprimentoCorredoresM = 0
  let qtdAreas = 0

  for (const o of objects) {
    // Corridors carry category 'storage' historically (see catalog.ts) but are circulation, not
    // storage footprint — excluded here so "área de armazenagem" isn't inflated by aisles.
    if (o.category === 'storage' && !CIRCULATION_TYPES.has(o.objectType)) areaArmazenagemM2 += footprintM2(o)
    if (o.category === 'equipment') {
      areaOperacionalM2 += footprintM2(o)
      qtdEquipamentos += 1
    }
    if (CIRCULATION_TYPES.has(o.objectType)) {
      areaCirculacaoM2 += footprintM2(o)
      if (o.objectType === 'corridor') comprimentoCorredoresM += Math.max(o.width, o.length) / 100
    }
    if (o.objectType === 'rack') {
      const bays = Number(o.properties.bays ?? 0)
      const levels = Number(o.properties.levels ?? 0)
      posicoesPallet += bays * levels
    }
    if (o.objectType === 'dock') qtdDocas += 1
    if (AREA_TYPES.has(o.objectType) || o.category === 'area') qtdAreas += 1
  }

  return {
    ...computeFlowMetrics(objects, flowNodes, flowConnections),
    areaTotalM2: envWidthM * envHeightM,
    areaArmazenagemM2,
    areaOperacionalM2,
    areaCirculacaoM2,
    posicoesPallet,
    qtdEquipamentos,
    qtdDocas,
    comprimentoCorredoresM,
    qtdAreas,
    qtdEtapasFluxo: flowNodes.length,
  }
}

/** Parte derivada do Fluxo — separada porque não depende de área nem de ambiente. */
function computeFlowMetrics(
  objects: LayoutObject[],
  flowNodes: FlowNode[],
  flowConnections: FlowConnection[],
): Pick<ProjectMetrics, 'qtdConexoesFluxo' | 'qtdEtapasIsoladas' | 'distanciaFluxoM' | 'capacidadeGargalo'> {
  const connected = new Set<string>()
  for (const c of flowConnections) {
    connected.add(c.fromNodeId)
    connected.add(c.toNodeId)
  }

  const objectsById = new Map(objects.map((o) => [o.id, o]))
  const nodesById = new Map(flowNodes.map((n) => [n.id, n]))

  let distanciaFluxoM: number | undefined
  for (const connection of flowConnections) {
    const from = nodesById.get(connection.fromNodeId)
    const to = nodesById.get(connection.toNodeId)
    const fromObject = from?.linkedObjectId ? objectsById.get(from.linkedObjectId) : undefined
    const toObject = to?.linkedObjectId ? objectsById.get(to.linkedObjectId) : undefined
    if (!fromObject || !toObject) continue
    const a = getCenter(fromObject)
    const b = getCenter(toObject)
    distanciaFluxoM = (distanciaFluxoM ?? 0) + Math.hypot(a.x - b.x, a.y - b.y) / 100
  }

  // Gargalo: menor vazão entre as etapas que declaram capacidade em unidade de fluxo. Só afirma
  // algo quando há pelo menos duas etapas comparáveis — com uma só, "gargalo" não significa nada.
  const throughputs = flowNodes
    .filter((n) => n.capacity !== undefined && n.capacity > 0 && n.capacityUnit?.endsWith('/h'))
    .map((n) => ({ valor: n.capacity as number, unidade: n.capacityUnit as string }))
  const byUnit = new Map<string, number[]>()
  for (const t of throughputs) byUnit.set(t.unidade, [...(byUnit.get(t.unidade) ?? []), t.valor])
  let capacidadeGargalo: { valor: number; unidade: string } | undefined
  for (const [unidade, valores] of byUnit) {
    if (valores.length < 2) continue
    const menor = Math.min(...valores)
    if (!capacidadeGargalo || menor < capacidadeGargalo.valor) capacidadeGargalo = { valor: menor, unidade }
  }

  return {
    qtdConexoesFluxo: flowConnections.length,
    qtdEtapasIsoladas: flowNodes.filter((n) => !connected.has(n.id)).length,
    distanciaFluxoM: distanciaFluxoM === undefined ? undefined : Math.round(distanciaFluxoM * 10) / 10,
    capacidadeGargalo,
  }
}
