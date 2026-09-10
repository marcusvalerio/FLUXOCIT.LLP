import { FLOW_NODE_TYPE_LABELS, getFlowOperationalFields, type FlowNode, type FlowNodeType } from '../../../types/flow'
import type { AnalysisContext, Insight } from './types'

/**
 * Regras sobre o modelo operacional (Flow). Nenhuma delas impede a edição: um projeto em
 * rascunho tem etapas soltas e números faltando por natureza — o papel aqui é apontar, não
 * bloquear. Por isso quase tudo é 'info' ou 'warning'; 'critical' fica reservado para
 * inconsistência de dados (uma referência que aponta para o vazio).
 */

/** Etapas que naturalmente começam a operação — não ter entrada nelas é esperado. */
const NATURAL_ENTRIES: ReadonlySet<FlowNodeType> = new Set<FlowNodeType>(['receiving', 'returns'])

/** Etapas que naturalmente encerram — não ter saída nelas é esperado. */
const NATURAL_EXITS: ReadonlySet<FlowNodeType> = new Set<FlowNodeType>(['shipping', 'quarantine'])

function nodeLabel(node: FlowNode): string {
  return node.name?.trim() || FLOW_NODE_TYPE_LABELS[node.type]
}

/** Vazão por hora, quando a etapa declara capacidade em unidade de fluxo (…/h). */
function throughputPerHour(node: FlowNode): number | null {
  if (node.capacity === undefined || node.capacity <= 0) return null
  if (!node.capacityUnit?.endsWith('/h')) return null
  return node.capacity
}

export function findIsolatedNodes({ flowNodes, flowConnections }: AnalysisContext): Insight[] {
  if (flowNodes.length < 2) return []
  const connected = new Set<string>()
  for (const c of flowConnections) {
    connected.add(c.fromNodeId)
    connected.add(c.toNodeId)
  }
  return flowNodes
    .filter((n) => !connected.has(n.id))
    .map((node) => ({
      id: `flow/isolated-node:${node.id}`,
      ruleId: 'flow/isolated-node',
      domain: 'flow' as const,
      severity: 'warning' as const,
      title: `Etapa isolada: ${nodeLabel(node)}`,
      description: 'Esta etapa não tem nenhuma conexão de entrada ou de saída, então não participa do fluxo modelado.',
      recommendation: 'Conecte-a às etapas vizinhas ou remova-a, se não fizer parte da operação.',
      targets: { flowNodeIds: [node.id] },
    }))
}

export function findDanglingEnds({ flowNodes, flowConnections }: AnalysisContext): Insight[] {
  if (flowNodes.length < 2) return []
  const hasInbound = new Set(flowConnections.map((c) => c.toNodeId))
  const hasOutbound = new Set(flowConnections.map((c) => c.fromNodeId))
  const insights: Insight[] = []

  for (const node of flowNodes) {
    const inbound = hasInbound.has(node.id)
    const outbound = hasOutbound.has(node.id)
    if (!inbound && !outbound) continue // já coberto por findIsolatedNodes

    if (!inbound && !NATURAL_ENTRIES.has(node.type)) {
      insights.push({
        id: `flow/no-inbound:${node.id}`,
        ruleId: 'flow/no-inbound',
        domain: 'flow',
        severity: 'info',
        title: `Sem origem: ${nodeLabel(node)}`,
        description: 'A etapa alimenta outras, mas nada chega até ela — o fluxo começa no meio da operação.',
        recommendation: 'Ligue a etapa anterior (recebimento, devolução ou a etapa que a abastece).',
        targets: { flowNodeIds: [node.id] },
      })
    }
    if (!outbound && !NATURAL_EXITS.has(node.type)) {
      insights.push({
        id: `flow/no-outbound:${node.id}`,
        ruleId: 'flow/no-outbound',
        domain: 'flow',
        severity: 'info',
        title: `Sem destino: ${nodeLabel(node)}`,
        description: 'A etapa recebe fluxo, mas nada sai dela — a operação termina aqui sem expedição.',
        recommendation: 'Ligue-a à próxima etapa, ou marque-a como uma etapa final (expedição/quarentena).',
        targets: { flowNodeIds: [node.id] },
      })
    }
  }
  return insights
}

/** Ciclo no grafo de conexões. Não é erro — devolução e retrabalho voltam mesmo —, mas merece
 * ser visto, porque também é o sintoma de uma seta desenhada no sentido errado. */
export function findCycles({ flowNodes, flowConnections }: AnalysisContext): Insight[] {
  const adjacency = new Map<string, string[]>()
  for (const c of flowConnections) {
    const list = adjacency.get(c.fromNodeId) ?? []
    list.push(c.toNodeId)
    adjacency.set(c.fromNodeId, list)
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const cycleNodes = new Set<string>()

  function visit(id: string, stack: string[]) {
    if (visiting.has(id)) {
      // Fecha o ciclo: tudo entre a primeira ocorrência e agora faz parte dele.
      const start = stack.indexOf(id)
      if (start >= 0) for (const n of stack.slice(start)) cycleNodes.add(n)
      return
    }
    if (visited.has(id)) return
    visiting.add(id)
    stack.push(id)
    for (const next of adjacency.get(id) ?? []) visit(next, stack)
    stack.pop()
    visiting.delete(id)
    visited.add(id)
  }

  for (const node of flowNodes) visit(node.id, [])
  if (cycleNodes.size === 0) return []

  const ids = [...cycleNodes].sort()
  const labels = ids
    .map((id) => flowNodes.find((n) => n.id === id))
    .filter((n): n is FlowNode => Boolean(n))
    .map(nodeLabel)

  return [
    {
      id: `flow/cycle:${ids.join(',')}`,
      ruleId: 'flow/cycle',
      domain: 'flow',
      severity: 'info',
      title: 'Ciclo no fluxo',
      description: `O fluxo volta sobre si mesmo passando por: ${labels.join(' → ')}.`,
      recommendation: 'Confirme se é retrabalho/devolução mesmo. Se não for, confira o sentido das setas.',
      targets: { flowNodeIds: ids },
    },
  ]
}

export function findMissingCapacity({ flowNodes }: AnalysisContext): Insight[] {
  return flowNodes
    .filter((node) => getFlowOperationalFields(node.type).capacity !== null)
    .filter((node) => node.capacity === undefined || node.capacity <= 0)
    .map((node) => ({
      id: `flow/missing-capacity:${node.id}`,
      ruleId: 'flow/missing-capacity',
      domain: 'flow' as const,
      severity: 'info' as const,
      title: `Sem capacidade declarada: ${nodeLabel(node)}`,
      description: 'Sem capacidade não dá para comparar etapas nem estimar gargalo neste trecho do fluxo.',
      recommendation: 'Informe a capacidade da etapa no painel de propriedades.',
      targets: { flowNodeIds: [node.id] },
    }))
}

/** Gargalo: a etapa seguinte processa menos que a anterior, então a fila se forma nela. */
export function findBottlenecks({ flowNodes, flowConnections }: AnalysisContext): Insight[] {
  const byId = new Map(flowNodes.map((n) => [n.id, n]))
  const insights: Insight[] = []

  for (const connection of flowConnections) {
    const from = byId.get(connection.fromNodeId)
    const to = byId.get(connection.toNodeId)
    if (!from || !to) continue

    const upstream = throughputPerHour(from)
    const downstream = throughputPerHour(to)
    // Só compara o que é comparável: mesma unidade e ambas em vazão.
    if (upstream === null || downstream === null || from.capacityUnit !== to.capacityUnit) continue
    if (downstream >= upstream) continue

    const gap = Math.round(((upstream - downstream) / upstream) * 100)
    insights.push({
      id: `flow/bottleneck:${connection.id}`,
      ruleId: 'flow/bottleneck',
      domain: 'flow',
      severity: gap >= 50 ? 'warning' : 'info',
      title: `Gargalo potencial em ${nodeLabel(to)}`,
      description: `${nodeLabel(from)} entrega ${upstream} ${from.capacityUnit} e ${nodeLabel(to)} processa ${downstream} ${to.capacityUnit} — ${gap}% a menos.`,
      recommendation: `Aumente a capacidade de ${nodeLabel(to)} ou reduza o ritmo de ${nodeLabel(from)}; sem isso, forma-se fila entre as duas.`,
      targets: { flowNodeIds: [from.id, to.id], flowConnectionIds: [connection.id] },
    })
  }
  return insights
}

/** Sequência operacional incompleta: um fluxo sem entrada ou sem saída modelada. */
export function findIncompleteSequence({ flowNodes }: AnalysisContext): Insight[] {
  if (flowNodes.length < 2) return []
  const hasEntry = flowNodes.some((n) => NATURAL_ENTRIES.has(n.type))
  const hasExit = flowNodes.some((n) => NATURAL_EXITS.has(n.type))
  if (hasEntry && hasExit) return []

  const missing = !hasEntry && !hasExit ? 'entrada e saída' : !hasEntry ? 'entrada' : 'saída'
  return [
    {
      id: 'flow/incomplete-sequence',
      ruleId: 'flow/incomplete-sequence',
      domain: 'flow',
      severity: 'info',
      title: `Fluxo sem ${missing}`,
      description: `O modelo operacional não tem etapa de ${missing} (recebimento/devolução na entrada, expedição/quarentena na saída).`,
      recommendation: `Acrescente a etapa de ${missing} para o fluxo representar a operação inteira.`,
      targets: {},
    },
  ]
}
