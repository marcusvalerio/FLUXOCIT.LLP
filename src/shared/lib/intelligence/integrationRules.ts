import { FLOW_NODE_TYPE_LABELS, type FlowNode } from '../../../types/flow'
import { getCenter } from '../geometry'
import type { AnalysisContext, Insight } from './types'

/**
 * Regras que só existem porque o ARGUS tem as duas camadas: elas cruzam o **modelo operacional**
 * com o **espaço físico**. É aqui que "planejar o espaço" e "entender a operação" se encontram —
 * nenhuma delas seria possível olhando só para o Layout ou só para o Flow.
 */

function nodeLabel(node: FlowNode): string {
  return node.name?.trim() || FLOW_NODE_TYPE_LABELS[node.type]
}

/** Referência quebrada: a etapa aponta para um objeto que não existe mais no Layout. */
export function findBrokenAreaLinks({ objects, flowNodes }: AnalysisContext): Insight[] {
  const objectIds = new Set(objects.map((o) => o.id))
  return flowNodes
    .filter((node) => node.linkedObjectId && !objectIds.has(node.linkedObjectId))
    .map((node) => ({
      id: `integration/broken-link:${node.id}`,
      ruleId: 'integration/broken-link',
      domain: 'integration' as const,
      severity: 'critical' as const,
      title: `Área vinculada não existe mais: ${nodeLabel(node)}`,
      description:
        'A etapa aponta para um objeto do Layout que foi excluído. O vínculo entre operação e espaço está quebrado.',
      recommendation: 'Vincule a etapa a uma área existente ou limpe o vínculo no painel de propriedades.',
      targets: { flowNodeIds: [node.id] },
    }))
}

/** Distância excessiva entre etapas ligadas: percurso longo demais entre duas operações seguidas. */
const LONG_DISTANCE_M = 60

export function findLongTransfers({ objects, flowNodes, flowConnections }: AnalysisContext): Insight[] {
  const objectsById = new Map(objects.map((o) => [o.id, o]))
  const nodesById = new Map(flowNodes.map((n) => [n.id, n]))
  const insights: Insight[] = []

  for (const connection of flowConnections) {
    const from = nodesById.get(connection.fromNodeId)
    const to = nodesById.get(connection.toNodeId)
    if (!from?.linkedObjectId || !to?.linkedObjectId) continue

    const fromObject = objectsById.get(from.linkedObjectId)
    const toObject = objectsById.get(to.linkedObjectId)
    if (!fromObject || !toObject) continue

    const a = getCenter(fromObject)
    const b = getCenter(toObject)
    const distanceM = Math.hypot(a.x - b.x, a.y - b.y) / 100
    if (distanceM <= LONG_DISTANCE_M) continue

    insights.push({
      id: `integration/long-transfer:${connection.id}`,
      ruleId: 'integration/long-transfer',
      domain: 'integration',
      severity: 'warning',
      title: `Percurso longo: ${nodeLabel(from)} → ${nodeLabel(to)}`,
      description: `As áreas vinculadas a estas duas etapas estão a ${distanceM.toFixed(1)} m uma da outra, medidos entre os centros.`,
      recommendation: 'Aproxime as áreas no Layout ou reveja a sequência — cada metro aqui vira deslocamento repetido todo dia.',
      targets: {
        flowNodeIds: [from.id, to.id],
        flowConnectionIds: [connection.id],
        objectIds: [fromObject.id, toObject.id],
      },
    })
  }

  return insights
}

/** Fluxo modelado sem nenhuma âncora no espaço: as duas camadas existem, mas não se falam. */
export function findUnlinkedFlow({ objects, flowNodes }: AnalysisContext): Insight[] {
  if (flowNodes.length === 0) return []
  const hasAreas = objects.some((o) => o.category === 'area')
  if (!hasAreas) return []
  if (flowNodes.some((node) => node.linkedObjectId)) return []

  return [
    {
      id: 'integration/unlinked-flow',
      ruleId: 'integration/unlinked-flow',
      domain: 'integration',
      severity: 'info',
      title: 'Fluxo não está ligado ao espaço',
      description:
        'O projeto tem áreas no Layout e etapas no Fluxo, mas nenhuma etapa está vinculada a uma área — as duas camadas descrevem a mesma operação sem se encontrarem.',
      recommendation: 'Vincule cada etapa à área onde ela acontece; é isso que habilita as análises de distância e gargalo.',
      targets: {},
    },
  ]
}
