import { getBoundingBox } from '../../../shared/lib/geometry'
import { CIRCULATION_TYPES, MOBILE_EQUIPMENT_TYPES, STORAGE_TYPES, UNIT_LOAD_TYPES } from './roles'
import type { LayoutObject } from '../../../types/layout'

/**
 * Snap logístico: alvos de encaixe que só fazem sentido pelo **significado** do objeto, não pela
 * sua geometria.
 *
 * O snap genérico já alinha aresta com aresta e centro com centro de qualquer par de objetos.
 * O que ele não sabe é que um pallet quer assentar no porta-paletes e que uma empilhadeira anda
 * pelo eixo do corredor. São essas duas regras — e só elas, porque são as que um planejador de
 * fato usa; inventar mais só para "ter snap" atrapalharia mais do que ajuda.
 *
 * A função devolve **linhas-alvo** por eixo, que entram no mesmo resolvedor do snap comum
 * (`resolveObjectSnap`): assim o feedback visual, o limiar e a prioridade continuam sendo os
 * mesmos, sem um segundo sistema de encaixe paralelo.
 */

export interface SnapTargetLines {
  /** Posições de mundo (cm) que atraem o objeto no eixo X. */
  x: number[]
  /** Posições de mundo (cm) que atraem o objeto no eixo Y. */
  y: number[]
}

/** Distância máxima (cm) para um alvo logístico ser considerado relevante ao objeto arrastado. */
const CONTEXT_RADIUS_CM = 600

function centerOf(obj: LayoutObject): { x: number; y: number } {
  const box = getBoundingBox(obj)
  return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 }
}

/**
 * Linhas de encaixe contextuais para o objeto que está sendo movido, dado o resto do layout.
 * Vazio quando o objeto não é carga unitizada nem equipamento móvel — a maioria dos casos.
 */
export function getLogisticsSnapLines(dragged: LayoutObject, others: LayoutObject[]): SnapTargetLines {
  const lines: SnapTargetLines = { x: [], y: [] }
  const isUnitLoad = UNIT_LOAD_TYPES.has(dragged.objectType)
  const isEquipment = MOBILE_EQUIPMENT_TYPES.has(dragged.objectType)
  if (!isUnitLoad && !isEquipment) return lines

  const draggedCenter = centerOf(dragged)

  for (const other of others) {
    const otherCenter = centerOf(other)
    const near =
      Math.abs(otherCenter.x - draggedCenter.x) <= CONTEXT_RADIUS_CM &&
      Math.abs(otherCenter.y - draggedCenter.y) <= CONTEXT_RADIUS_CM
    if (!near) continue

    // Carga unitizada assenta centralizada na estrutura de armazenagem.
    if (isUnitLoad && STORAGE_TYPES.has(other.objectType)) {
      lines.x.push(otherCenter.x)
      lines.y.push(otherCenter.y)
      continue
    }

    // Equipamento acompanha o eixo do corredor: a via é longa num eixo e estreita no outro, e é
    // a linha central do lado estreito que serve de trilho.
    if (isEquipment && CIRCULATION_TYPES.has(other.objectType)) {
      const box = getBoundingBox(other)
      const width = box.maxX - box.minX
      const height = box.maxY - box.minY
      if (width >= height) lines.y.push(otherCenter.y)
      else lines.x.push(otherCenter.x)
    }
  }

  return lines
}
