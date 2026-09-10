import type { LayoutObject } from '../../types/layout'

/** Snaps a value (cm) to the nearest multiple of stepCm. See docs/BUSINESS_RULES.md BR-20. */
export function snapToGrid(valueCm: number, stepCm: number): number {
  if (stepCm <= 0) return valueCm
  return Math.round(valueCm / stepCm) * stepCm
}

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Axis-aligned bounding box of the object's rotated footprint (world space, cm). */
export function getBoundingBox(obj: LayoutObject): BoundingBox {
  const cx = obj.x + obj.width / 2
  const cy = obj.y + obj.length / 2
  const rad = (obj.rotationDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const halfW = (obj.width * cos + obj.length * sin) / 2
  const halfH = (obj.width * sin + obj.length * cos) / 2
  return {
    minX: cx - halfW,
    minY: cy - halfH,
    maxX: cx + halfW,
    maxY: cy + halfH,
  }
}

export function getCenter(obj: LayoutObject): { x: number; y: number } {
  return { x: obj.x + obj.width / 2, y: obj.y + obj.length / 2 }
}

export interface Point {
  x: number
  y: number
}

/**
 * Os quatro cantos do objeto já rotacionados (mundo, cm), em ordem horária a partir do canto
 * superior esquerdo do retângulo não rotacionado. A rotação é em torno do centro, como no canvas.
 */
export function getCorners(obj: LayoutObject): [Point, Point, Point, Point] {
  const cx = obj.x + obj.width / 2
  const cy = obj.y + obj.length / 2
  const rad = (obj.rotationDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const hw = obj.width / 2
  const hl = obj.length / 2

  const corner = (dx: number, dy: number): Point => ({
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  })

  return [corner(-hw, -hl), corner(hw, -hl), corner(hw, hl), corner(-hw, hl)]
}

function projectionRange(points: Point[], axis: Point): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    const value = p.x * axis.x + p.y * axis.y
    if (value < min) min = value
    if (value > max) max = value
  }
  return { min, max }
}

/**
 * Interseção entre o retângulo da seleção (sempre alinhado aos eixos) e a pegada **real** do
 * objeto, que pode estar rotacionada — teorema dos eixos separadores sobre os quatro eixos
 * relevantes (os dois do retângulo e os dois das arestas do objeto).
 *
 * Usar só o bounding box alinhado aos eixos, como é comum em implementações ingênuas, faria a
 * seleção em área capturar objetos girados que o retângulo nem chega a tocar — quanto mais
 * próximo de 45°, maior o erro.
 */
export function rectIntersectsObject(rect: BoundingBox, obj: LayoutObject): boolean {
  const rectPoints: Point[] = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ]
  const objPoints = getCorners(obj)

  const rad = (obj.rotationDeg * Math.PI) / 180
  const axes: Point[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: Math.cos(rad), y: Math.sin(rad) },
    { x: -Math.sin(rad), y: Math.cos(rad) },
  ]

  for (const axis of axes) {
    const a = projectionRange(rectPoints, axis)
    const b = projectionRange(objPoints, axis)
    if (a.max < b.min || b.max < a.min) return false
  }
  return true
}
