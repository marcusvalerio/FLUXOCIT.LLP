/** Process-step node types for the Fluxo board — mirrors the área subtypes used on the Layout
 * board (docs/DESIGN_SYSTEM.md § 2.3) so a node's color/identity stays consistent whether it's
 * viewed as a flow step or as a physical area. */
export type FlowNodeType =
  | 'receiving'
  | 'inspection'
  | 'storage'
  | 'picking'
  | 'staging'
  | 'shipping'
  | 'returns'
  | 'quarantine'
  | 'administrative'
  | 'custom'

/** Unidades de capacidade de uma etapa. Fluxo (…/h) para etapas de processamento; estoque
 * (pallets, posições) para etapas que acumulam, como armazenagem e quarentena. */
export const FLOW_CAPACITY_UNITS = ['pallets/h', 'caixas/h', 'pedidos/h', 'veículos/h', 'pallets', 'posições'] as const
export type FlowCapacityUnit = (typeof FLOW_CAPACITY_UNITS)[number]

export const FLOW_TIME_UNITS = ['s', 'min', 'h'] as const
export type FlowTimeUnit = (typeof FLOW_TIME_UNITS)[number]

export interface FlowNode {
  id: string
  type: FlowNodeType
  name?: string
  x: number
  y: number
  notes?: string
  /** Optional link to a LayoutObject.id — associates this process step with a physical
   * area/object already placed on the Layout board (see docs/ARCHITECTURE.md § Fluxo). */
  linkedObjectId?: string
  /**
   * Metadata operacional — o que transforma o Fluxo de diagrama em modelo da operação. Todos
   * opcionais: um projeto em rascunho não deve ser obrigado a estimar números que ainda não
   * conhece, e a Intelligence sinaliza a ausência quando ela importa (ver lib/intelligence).
   */
  capacity?: number
  capacityUnit?: FlowCapacityUnit
  processTime?: number
  processTimeUnit?: FlowTimeUnit
}

/**
 * Quais campos operacionais fazem sentido para cada tipo de etapa — o painel só mostra o que é
 * relevante, em vez de pedir "capacidade" de uma área administrativa.
 *
 * `capacity: 'throughput'` é vazão (o que passa por hora); `'stock'` é acúmulo (o que cabe).
 */
export interface FlowOperationalFields {
  capacity: 'throughput' | 'stock' | null
  time: boolean
  defaultCapacityUnit: FlowCapacityUnit
}

const OPERATIONAL_FIELDS: Record<FlowNodeType, FlowOperationalFields> = {
  receiving: { capacity: 'throughput', time: true, defaultCapacityUnit: 'pallets/h' },
  inspection: { capacity: 'throughput', time: true, defaultCapacityUnit: 'caixas/h' },
  storage: { capacity: 'stock', time: false, defaultCapacityUnit: 'posições' },
  picking: { capacity: 'throughput', time: true, defaultCapacityUnit: 'pedidos/h' },
  staging: { capacity: 'stock', time: true, defaultCapacityUnit: 'pallets' },
  shipping: { capacity: 'throughput', time: true, defaultCapacityUnit: 'pallets/h' },
  returns: { capacity: 'throughput', time: true, defaultCapacityUnit: 'caixas/h' },
  quarantine: { capacity: 'stock', time: false, defaultCapacityUnit: 'pallets' },
  administrative: { capacity: null, time: false, defaultCapacityUnit: 'pedidos/h' },
  custom: { capacity: 'throughput', time: true, defaultCapacityUnit: 'pallets/h' },
}

export function getFlowOperationalFields(type: FlowNodeType): FlowOperationalFields {
  return OPERATIONAL_FIELDS[type]
}

/** Rótulo curto da capacidade conforme a natureza da etapa. */
export function getCapacityLabel(type: FlowNodeType): string {
  return getFlowOperationalFields(type).capacity === 'stock' ? 'Capacidade (estoque)' : 'Capacidade (vazão)'
}

/** Extensible per BR: each connection carries a semantic flow type (material/pallet/pessoas/
 * empilhadeira/picking), not just a generic arrow. */
export type FlowConnectionType = 'material' | 'pallet' | 'people' | 'forklift' | 'picking'

export interface FlowConnection {
  id: string
  fromNodeId: string
  toNodeId: string
  flowType: FlowConnectionType
  label?: string
}

export const FLOW_NODE_SIZE = { width: 160, height: 64 }

export const FLOW_NODE_TYPE_LABELS: Record<FlowNodeType, string> = {
  receiving: 'Recebimento',
  inspection: 'Conferência',
  storage: 'Armazenagem',
  picking: 'Picking',
  staging: 'Staging',
  shipping: 'Expedição',
  returns: 'Devolução',
  quarantine: 'Quarentena',
  administrative: 'Área administrativa',
  custom: 'Área personalizada',
}

/** Same hues as AREA_TYPE_COLORS (src/shared/lib/colors.ts) — 'inspection' is the one type with
 * no área-subtype equivalent there, matching AreaInspection.tsx's own accent. */
export const FLOW_NODE_TYPE_COLORS: Record<FlowNodeType, string> = {
  receiving: '#0D9488',
  inspection: '#0EA5E9',
  storage: '#B45309',
  picking: '#7C3AED',
  staging: '#D97706',
  shipping: '#2563EB',
  returns: '#DB2777',
  quarantine: '#DC2626',
  administrative: '#0EA5E9',
  custom: '#334155',
}

export const FLOW_NODE_TYPES_ORDER: FlowNodeType[] = [
  'receiving',
  'inspection',
  'storage',
  'picking',
  'staging',
  'shipping',
  'returns',
  'quarantine',
  'administrative',
  'custom',
]

export const FLOW_CONNECTION_TYPE_LABELS: Record<FlowConnectionType, string> = {
  material: 'Materiais',
  pallet: 'Pallets',
  people: 'Pessoas',
  forklift: 'Empilhadeiras',
  picking: 'Picking',
}

/** Shared between the Fluxo board's own connection arrows and the Layout board's flow overlay
 * (P7) — one visual language for "this is a material/pallet/people/forklift/picking flow". */
export const FLOW_CONNECTION_STYLE: Record<FlowConnectionType, { stroke: string; strokeWidth: number; dash?: number[] }> = {
  material: { stroke: '#334155', strokeWidth: 2 },
  pallet: { stroke: '#8B5E34', strokeWidth: 3 },
  people: { stroke: '#0D9488', strokeWidth: 2, dash: [2, 4] },
  forklift: { stroke: '#2563EB', strokeWidth: 3 },
  picking: { stroke: '#7C3AED', strokeWidth: 2, dash: [8, 4] },
}
