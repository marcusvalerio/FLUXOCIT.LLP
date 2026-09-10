import { snapToGrid } from '../../../shared/lib/geometry'

export interface PointCm {
  x: number
  y: number
}

export interface RectGeometry {
  x: number
  y: number
  width: number
  length: number
  rotationDeg: number
}

/** Menor lado aceito ao desenhar (cm) — abaixo disso o gesto foi um clique, não um desenho. */
export const MIN_DRAFT_SIZE_CM = 10

/**
 * Geometria de um gesto de desenho, em coordenadas de mundo (cm). É lógica pura de propósito:
 * o canvas cuida de eventos e pixels, estas funções cuidam do que vira objeto.
 */

/** Ajusta um ponto à grade quando o snap está ligado. */
export function snapPoint(point: PointCm, stepCm: number, enabled: boolean): PointCm {
  if (!enabled || stepCm <= 0) return point
  return { x: snapToGrid(point.x, stepCm), y: snapToGrid(point.y, stepCm) }
}

/**
 * Trava o segmento no múltiplo de 15° mais próximo, preservando o comprimento — o equivalente
 * de "Shift" em qualquer editor técnico, e o que garante paredes realmente ortogonais.
 */
export function constrainAngle(start: PointCm, end: PointCm, stepDeg = 15): PointCm {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return end
  const angle = Math.atan2(dy, dx)
  const step = (stepDeg * Math.PI) / 180
  const snapped = Math.round(angle / step) * step
  return { x: start.x + Math.cos(snapped) * length, y: start.y + Math.sin(snapped) * length }
}

/**
 * Parede a partir de dois pontos: o segmento vira um retângulo com a espessura informada,
 * centrado na linha e girado no ângulo do traço. Devolve a geometria no formato do modelo
 * (x/y = canto superior esquerdo do retângulo **não** rotacionado, rotação em torno do centro).
 */
export function wallFromPoints(start: PointCm, end: PointCm, thicknessCm: number): RectGeometry | null {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length < MIN_DRAFT_SIZE_CM) return null

  const centerX = (start.x + end.x) / 2
  const centerY = (start.y + end.y) / 2
  const rotationDeg = (Math.atan2(dy, dx) * 180) / Math.PI

  return {
    x: centerX - length / 2,
    y: centerY - thicknessCm / 2,
    width: Math.round(length * 10) / 10,
    length: thicknessCm,
    rotationDeg: Math.round(((rotationDeg % 360) + 360) % 360 * 10) / 10,
  }
}

/** Retângulo (área) a partir de dois cantos opostos, em qualquer direção de arraste. */
export function rectFromPoints(start: PointCm, end: PointCm): RectGeometry | null {
  const width = Math.abs(end.x - start.x)
  const length = Math.abs(end.y - start.y)
  if (width < MIN_DRAFT_SIZE_CM || length < MIN_DRAFT_SIZE_CM) return null
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.round(width * 10) / 10,
    length: Math.round(length * 10) / 10,
    rotationDeg: 0,
  }
}

/** Distância real entre dois pontos, em centímetros. */
export function distanceCm(start: PointCm, end: PointCm): number {
  return Math.hypot(end.x - start.x, end.y - start.y)
}

/** Rótulo de medição na unidade do projeto — metros, como todo o resto da interface. */
export function formatDistance(cm: number): string {
  const meters = cm / 100
  if (meters < 1) return `${Math.round(cm)} cm`
  return `${meters.toFixed(2)} m`
}
