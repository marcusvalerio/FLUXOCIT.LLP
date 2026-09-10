import type { LayoutObject } from '../../../types/layout'
import type { FlowConnection, FlowNode } from '../../../types/flow'

/**
 * Camada de Intelligence do ARGUS.LLP.
 *
 * Quatro compromissos, e é deles que vem a utilidade:
 *
 * - **Determinística** — as mesmas entradas produzem exatamente os mesmos insights, sempre.
 * - **Explicável** — cada insight diz qual regra o gerou e o que fazer a respeito. Nada de
 *   "o sistema achou": quem lê sabe por quê.
 * - **Testável** — funções puras sobre Layout + Flow, sem tocar em React, canvas ou store.
 * - **Independente da UI** — a interface apresenta insights; não os calcula nem os interpreta.
 *
 * Não há IA generativa aqui, e é deliberado: primeiro um modelo espacial e operacional
 * confiável, depois inteligência sobre esse modelo (ver docs/PRODUCT.md).
 */

export type InsightSeverity = 'info' | 'warning' | 'critical'

/** De onde o insight veio — usado para agrupar, filtrar e explicar. */
export type InsightDomain = 'layout' | 'flow' | 'integration'

export interface InsightTargets {
  objectIds?: string[]
  flowNodeIds?: string[]
  flowConnectionIds?: string[]
}

export interface Insight {
  /** Estável entre execuções com o mesmo estado — permite comparar/ignorar sem re-render extra. */
  id: string
  /** Identificador da regra que originou o alerta (ex.: 'flow/isolated-node'). */
  ruleId: string
  domain: InsightDomain
  severity: InsightSeverity
  title: string
  description: string
  /** O que fazer — um insight sem recomendação é só uma reclamação. */
  recommendation: string
  targets: InsightTargets
}

/** Tudo que as regras podem olhar. Um retrato do projeto, sem nada da interface. */
export interface AnalysisContext {
  objects: LayoutObject[]
  flowNodes: FlowNode[]
  flowConnections: FlowConnection[]
  envWidthM: number
  envHeightM: number
}

/** Uma regra é uma função pura de contexto para insights. Adicionar regra é escrever uma função
 * e registrá-la — nada no núcleo do editor muda. */
export type InsightRule = (context: AnalysisContext) => Insight[]

export const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
}
