import { OBJECT_CATALOG } from './catalog'
import type { ObjectTypeKey } from '../../../types/layout'

/**
 * O que se pode fazer com um objeto — declarado pelo tipo, consumido pelo editor.
 *
 * Separar **capacidade do objeto** de **interação do editor** é o que permite o canvas mostrar
 * as alças certas sem saber o que é uma parede ou uma empilhadeira: ele pergunta ao registro.
 */
export type ResizeMode =
  /** Redimensiona nos dois eixos (áreas, blocos, estruturas retangulares). */
  | 'both'
  /** Só no próprio comprimento — elementos lineares, cuja espessura é uma propriedade do tipo,
   * não algo que se estica com o mouse (parede, corredor, faixa, rota). */
  | 'length'
  /** Dimensão fixa: um pallet PBR ou uma empilhadeira têm tamanho real, não se estica. */
  | 'none'

export interface ObjectCapabilities {
  resize: ResizeMode
  rotate: boolean
}

/** Elementos lineares: o gesto útil é alongar, nunca engrossar por acidente. */
const LINEAR_TYPES: ReadonlySet<ObjectTypeKey> = new Set<ObjectTypeKey>([
  'wall',
  'corridor',
  'traffic-lane',
  'pedestrian-lane',
  'flow-route',
])

export function getObjectCapabilities(objectType: ObjectTypeKey): ObjectCapabilities {
  const def = OBJECT_CATALOG[objectType]
  if (!def.resizable) return { resize: 'none', rotate: true }
  return { resize: LINEAR_TYPES.has(objectType) ? 'length' : 'both', rotate: true }
}

/** Alças do Konva Transformer correspondentes a cada modo — a tradução capacidade → interação. */
export function anchorsForResizeMode(mode: ResizeMode): string[] {
  if (mode === 'none') return []
  if (mode === 'length') return ['middle-left', 'middle-right']
  return [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'top-center',
    'bottom-center',
    'middle-left',
    'middle-right',
  ]
}
