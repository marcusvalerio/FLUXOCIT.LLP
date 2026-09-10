import { getCorners, snapToGrid } from '../../../shared/lib/geometry'
import { LINEAR_TYPES } from '../objects/roles'
import type { LayoutObject } from '../../../types/layout'
import type { PointCm } from './draftGeometry'

/**
 * Snap de ponto para as ferramentas de desenho (Parede, Área, Medir).
 *
 * Diferente do snap de arrasto — que alinha *caixas* por aresta e centro —, desenhar exige
 * encaixar **pontos**: a ponta de uma parede nova precisa cair exatamente na ponta da parede
 * existente, sem deixar um vão de 3 cm que só aparece quando alguém dá zoom.
 *
 * Prioridade (a primeira que estiver dentro do limiar vence):
 *   1. extremidade de um elemento linear (parede, corredor, faixa) — o encaixe mais preciso;
 *   2. centro de um objeto;
 *   3. ponto mais próximo sobre o eixo de um elemento linear (encostar no meio da parede);
 *   4. grade.
 *
 * Tudo em coordenadas de mundo (cm) e sem depender de zoom: quem converte o limiar de pixels de
 * tela para cm é o canvas, então o encaixe "parece" igual em qualquer nível de aproximação.
 */
export type SnapPointKind = 'endpoint' | 'center' | 'edge' | 'grid' | 'none'

export interface SnapPointResult {
  point: PointCm
  kind: SnapPointKind
  /** Ponto exato do alvo, para o canvas desenhar o marcador de encaixe. */
  target?: PointCm
}

export interface SnapCandidates {
  /** Extremidades de elementos lineares (as duas pontas do eixo). */
  endpoints: PointCm[]
  /** Centros de objetos. */
  centers: PointCm[]
  /** Eixos de elementos lineares, como segmentos entre as duas extremidades. */
  segments: { a: PointCm; b: PointCm }[]
}

/** As duas pontas do eixo de um elemento linear, já rotacionadas (mundo, cm). */
export function getLinearEndpoints(obj: LayoutObject): [PointCm, PointCm] {
  const corners = getCorners(obj)
  // O eixo do elemento é o lado longo do retângulo: os pontos médios dos dois lados curtos.
  const [tl, tr, br, bl] = corners
  return [
    { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 },
    { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 },
  ]
}

/** Reúne os pontos de encaixe do projeto, ignorando objetos que o próprio gesto está criando. */
export function collectSnapCandidates(objects: LayoutObject[]): SnapCandidates {
  const endpoints: PointCm[] = []
  const centers: PointCm[] = []
  const segments: { a: PointCm; b: PointCm }[] = []

  for (const obj of objects) {
    centers.push({ x: obj.x + obj.width / 2, y: obj.y + obj.length / 2 })
    if (LINEAR_TYPES.has(obj.objectType)) {
      const [a, b] = getLinearEndpoints(obj)
      endpoints.push(a, b)
      segments.push({ a, b })
    }
  }

  return { endpoints, centers, segments }
}

function distance(a: PointCm, b: PointCm): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function nearest(point: PointCm, candidates: PointCm[], thresholdCm: number): PointCm | null {
  let best: PointCm | null = null
  let bestDistance = thresholdCm
  for (const candidate of candidates) {
    const d = distance(point, candidate)
    if (d <= bestDistance) {
      best = candidate
      bestDistance = d
    }
  }
  return best
}

/** Projeção do ponto sobre o segmento, limitada às extremidades. */
export function closestPointOnSegment(point: PointCm, a: PointCm, b: PointCm): PointCm {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return a
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

export function snapDraftPoint(
  point: PointCm,
  candidates: SnapCandidates,
  options: { thresholdCm: number; gridStepCm: number; enabled: boolean },
): SnapPointResult {
  if (!options.enabled) return { point, kind: 'none' }

  const endpoint = nearest(point, candidates.endpoints, options.thresholdCm)
  if (endpoint) return { point: endpoint, kind: 'endpoint', target: endpoint }

  const center = nearest(point, candidates.centers, options.thresholdCm)
  if (center) return { point: center, kind: 'center', target: center }

  const onSegments = candidates.segments.map((segment) =>
    closestPointOnSegment(point, segment.a, segment.b),
  )
  const edge = nearest(point, onSegments, options.thresholdCm)
  if (edge) return { point: edge, kind: 'edge', target: edge }

  if (options.gridStepCm > 0) {
    return {
      point: { x: snapToGrid(point.x, options.gridStepCm), y: snapToGrid(point.y, options.gridStepCm) },
      kind: 'grid',
    }
  }

  return { point, kind: 'none' }
}
