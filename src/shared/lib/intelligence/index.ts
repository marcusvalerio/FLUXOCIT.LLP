import {
  findBottlenecks,
  findCycles,
  findDanglingEnds,
  findIncompleteSequence,
  findIsolatedNodes,
  findMissingCapacity,
} from './flowRules'
import { findBrokenAreaLinks, findLongTransfers, findUnlinkedFlow } from './integrationRules'
import { findOccupancyInsights, findSpatialInsights } from './layoutRules'
import { SEVERITY_ORDER, type AnalysisContext, type Insight, type InsightRule, type InsightSeverity } from './types'

export * from './types'

/**
 * Registro de regras. Acrescentar uma análise é escrever uma função pura e incluí-la aqui —
 * nada no editor, no canvas ou no store muda.
 */
export const INSIGHT_RULES: readonly InsightRule[] = [
  // Layout — espaço físico
  findSpatialInsights,
  findOccupancyInsights,
  // Flow — modelo operacional
  findIsolatedNodes,
  findDanglingEnds,
  findCycles,
  findMissingCapacity,
  findBottlenecks,
  findIncompleteSequence,
  // Integração — onde as duas camadas se cruzam
  findBrokenAreaLinks,
  findLongTransfers,
  findUnlinkedFlow,
]

/**
 * Analisa o projeto inteiro. Ordena por severidade e, dentro dela, por id — a lista é estável
 * entre execuções, então a interface não embaralha alertas a cada recálculo.
 */
export function analyzeProject(context: AnalysisContext): Insight[] {
  const insights = INSIGHT_RULES.flatMap((rule) => rule(context))
  return insights.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    return bySeverity !== 0 ? bySeverity : a.id.localeCompare(b.id)
  })
}

export interface InsightSummary {
  total: number
  critical: number
  warning: number
  info: number
}

export function summarizeInsights(insights: Insight[]): InsightSummary {
  const count = (severity: InsightSeverity) => insights.filter((i) => i.severity === severity).length
  return {
    total: insights.length,
    critical: count('critical'),
    warning: count('warning'),
    info: count('info'),
  }
}
