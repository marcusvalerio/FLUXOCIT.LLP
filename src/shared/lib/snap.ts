import type { BoundingBox } from './geometry'

export interface AxisSnapResult {
  /** Delta (cm) to add to the dragged box's position on this axis to align it. */
  delta: number
  /** World position (cm) of the matched line, used to draw a guide. */
  guidePosition: number
}

export interface ObjectSnapResult {
  x?: AxisSnapResult
  y?: AxisSnapResult
}

function axisCandidates(min: number, max: number): number[] {
  return [min, (min + max) / 2, max]
}

/**
 * Finds the closest edge/center alignment between the dragged object's bounding box and any
 * other object's bounding box, independently per axis, within thresholdCm. See docs/BUSINESS_RULES.md
 * BR-21: object snapping takes priority over grid snapping when both apply within the threshold.
 */
export function resolveObjectSnap(
  draggedBox: BoundingBox,
  otherBoxes: BoundingBox[],
  thresholdCm: number,
  /** Linhas-alvo adicionais por eixo — hoje o snap logístico (ver shared/lib/logisticsSnap).
   * Entram no mesmo resolvedor de propósito: mesma prioridade, mesmo limiar, mesma guia. */
  extraTargets?: { x: number[]; y: number[] },
): ObjectSnapResult {
  const draggedX = axisCandidates(draggedBox.minX, draggedBox.maxX)
  const draggedY = axisCandidates(draggedBox.minY, draggedBox.maxY)

  let bestX: (AxisSnapResult & { diff: number }) | null = null
  let bestY: (AxisSnapResult & { diff: number }) | null = null

  // Alvos logísticos são avaliados PRIMEIRO: em caso de empate de distância, encaixar um pallet
  // no centro do porta-paletes ganha de alinhar a aresta dele com a aresta do rack. O alvo
  // semântico só existe para pares compatíveis, então quando aparece é quase sempre a intenção.
  const targetsX = extraTargets?.x.length ? [extraTargets.x] : []
  const targetsY = extraTargets?.y.length ? [extraTargets.y] : []
  for (const other of otherBoxes) {
    targetsX.push(axisCandidates(other.minX, other.maxX))
    targetsY.push(axisCandidates(other.minY, other.maxY))
  }

  for (let i = 0; i < Math.max(targetsX.length, targetsY.length); i++) {
    const otherX = targetsX[i] ?? []
    const otherY = targetsY[i] ?? []

    for (const dx of draggedX) {
      for (const ox of otherX) {
        const diff = Math.abs(ox - dx)
        if (diff <= thresholdCm && (!bestX || diff < bestX.diff)) {
          bestX = { delta: ox - dx, guidePosition: ox, diff }
        }
      }
    }
    for (const dy of draggedY) {
      for (const oy of otherY) {
        const diff = Math.abs(oy - dy)
        if (diff <= thresholdCm && (!bestY || diff < bestY.diff)) {
          bestY = { delta: oy - dy, guidePosition: oy, diff }
        }
      }
    }
  }

  return {
    x: bestX ? { delta: bestX.delta, guidePosition: bestX.guidePosition } : undefined,
    y: bestY ? { delta: bestY.delta, guidePosition: bestY.guidePosition } : undefined,
  }
}
