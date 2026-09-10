import { describe, expect, it } from 'vitest'
import { getBoundingBox, getCorners, rectIntersectsObject, snapToGrid } from './geometry'
import type { LayoutObject } from '../../types/layout'

function makeObject(overrides: Partial<LayoutObject> = {}): LayoutObject {
  return {
    id: '1',
    objectType: 'pallet',
    category: 'pallet',
    x: 0,
    y: 0,
    width: 120,
    length: 100,
    rotationDeg: 0,
    zIndex: 0,
    properties: {},
    ...overrides,
  }
}

describe('snapToGrid', () => {
  it('snaps to the nearest multiple of the step', () => {
    expect(snapToGrid(107, 10)).toBe(110)
    expect(snapToGrid(104, 10)).toBe(100)
    expect(snapToGrid(105, 10)).toBe(110)
  })

  it('returns the value unchanged when step is zero', () => {
    expect(snapToGrid(123, 0)).toBe(123)
  })
})

describe('getBoundingBox', () => {
  it('matches the object footprint when not rotated', () => {
    const obj = makeObject({ x: 10, y: 20, width: 100, length: 50 })
    expect(getBoundingBox(obj)).toEqual({ minX: 10, minY: 20, maxX: 110, maxY: 70 })
  })

  it('swaps width/length extent when rotated 90 degrees', () => {
    const obj = makeObject({ x: 0, y: 0, width: 100, length: 50, rotationDeg: 90 })
    const box = getBoundingBox(obj)
    expect(box.maxX - box.minX).toBeCloseTo(50, 5)
    expect(box.maxY - box.minY).toBeCloseTo(100, 5)
  })
})

describe('seleção em área com objetos rotacionados', () => {
  /** Objeto de 400×100 cm centrado em (0,0), girado 45°: a diagonal do bounding box alinhado
   * aos eixos passa longe da pegada real perto dos cantos. */
  function diagonalObject() {
    return makeObject({ x: -200, y: -50, width: 400, length: 100, rotationDeg: 45 })
  }

  it('devolve os quatro cantos girados em torno do centro', () => {
    const corners = getCorners(makeObject({ x: -50, y: -50, width: 100, length: 100, rotationDeg: 90 }))
    // Um quadrado girado 90° ocupa o mesmo lugar; os cantos apenas trocam de posição na lista.
    for (const corner of corners) {
      expect(Math.abs(corner.x)).toBeCloseTo(50, 6)
      expect(Math.abs(corner.y)).toBeCloseTo(50, 6)
    }
  })

  it('seleciona quando o retângulo realmente cruza a pegada girada', () => {
    const rect = { minX: -30, minY: -30, maxX: 30, maxY: 30 }
    expect(rectIntersectsObject(rect, diagonalObject())).toBe(true)
  })

  it('NÃO seleciona no canto do bounding box, onde o objeto girado não está', () => {
    const obj = diagonalObject()
    const box = getBoundingBox(obj)
    // Cantinho superior esquerdo do bounding box: dentro da caixa, fora do objeto.
    const rect = { minX: box.minX + 2, minY: box.minY + 2, maxX: box.minX + 30, maxY: box.minY + 30 }

    // A verificação ingênua (caixa × caixa) daria positivo aqui — é exatamente o falso positivo
    // que a interseção por eixos separadores elimina.
    const naiveHit =
      box.minX < rect.maxX && box.maxX > rect.minX && box.minY < rect.maxY && box.maxY > rect.minY
    expect(naiveHit).toBe(true)
    expect(rectIntersectsObject(rect, obj)).toBe(false)
  })

  it('seleciona um objeto totalmente contido no retângulo', () => {
    const rect = { minX: -500, minY: -500, maxX: 500, maxY: 500 }
    expect(rectIntersectsObject(rect, diagonalObject())).toBe(true)
  })

  it('não seleciona um objeto totalmente fora', () => {
    const rect = { minX: 1000, minY: 1000, maxX: 1200, maxY: 1200 }
    expect(rectIntersectsObject(rect, diagonalObject())).toBe(false)
  })

  it('continua correto para objetos sem rotação', () => {
    const obj = makeObject({ x: 0, y: 0, width: 100, length: 100, rotationDeg: 0 })
    expect(rectIntersectsObject({ minX: 50, minY: 50, maxX: 150, maxY: 150 }, obj)).toBe(true)
    expect(rectIntersectsObject({ minX: 101, minY: 0, maxX: 200, maxY: 100 }, obj)).toBe(false)
  })
})
