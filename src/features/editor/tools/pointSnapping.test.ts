import { describe, expect, it } from 'vitest'
import {
  closestPointOnSegment,
  collectSnapCandidates,
  getLinearEndpoints,
  snapDraftPoint,
} from './pointSnapping'
import type { LayoutObject } from '../../../types/layout'

function wall(overrides: Partial<LayoutObject> = {}): LayoutObject {
  return {
    id: 'w1',
    objectType: 'wall',
    category: 'structure',
    x: 0,
    y: 0,
    width: 400,
    length: 20,
    rotationDeg: 0,
    zIndex: 0,
    properties: {},
    ...overrides,
  }
}

const opts = (thresholdCm: number) => ({ thresholdCm, gridStepCm: 10, enabled: true })

describe('snap de ponto das ferramentas de desenho', () => {
  describe('extremidades de elementos lineares', () => {
    it('acha as duas pontas de uma parede horizontal', () => {
      const [a, b] = getLinearEndpoints(wall())
      expect(a.x).toBeCloseTo(0, 6)
      expect(a.y).toBeCloseTo(10, 6)
      expect(b.x).toBeCloseTo(400, 6)
      expect(b.y).toBeCloseTo(10, 6)
    })

    it('acompanha a rotação do objeto', () => {
      // Parede girada 90°: o eixo passa a ser vertical, em torno do mesmo centro.
      const [a, b] = getLinearEndpoints(wall({ rotationDeg: 90 }))
      expect(a.x).toBeCloseTo(200, 6)
      expect(b.x).toBeCloseTo(200, 6)
      expect(Math.min(a.y, b.y)).toBeCloseTo(-190, 6)
      expect(Math.max(a.y, b.y)).toBeCloseTo(210, 6)
    })
  })

  describe('prioridade do encaixe', () => {
    const candidates = collectSnapCandidates([wall()])

    it('encaixa exatamente na extremidade, sem deixar vão', () => {
      const result = snapDraftPoint({ x: 397, y: 12 }, candidates, opts(20))
      expect(result.kind).toBe('endpoint')
      expect(result.point).toEqual({ x: 400, y: 10 })
    })

    it('encaixa no eixo da parede ao encostar no meio dela', () => {
      // Longe das pontas e do centro do objeto: sobra o eixo.
      const result = snapDraftPoint({ x: 120, y: 14 }, candidates, opts(20))
      expect(result.kind).toBe('edge')
      expect(result.point.x).toBeCloseTo(120, 6)
      expect(result.point.y).toBeCloseTo(10, 6)
    })

    it('prefere o centro do objeto ao eixo quando o ponto cai sobre ele', () => {
      const result = snapDraftPoint({ x: 200, y: 14 }, candidates, opts(20))
      expect(result.kind).toBe('center')
      expect(result.point).toEqual({ x: 200, y: 10 })
    })

    it('prefere a extremidade ao eixo quando ambos estão ao alcance', () => {
      const result = snapDraftPoint({ x: 398, y: 11 }, candidates, opts(20))
      expect(result.kind).toBe('endpoint')
    })

    it('cai na grade quando nada está ao alcance', () => {
      const result = snapDraftPoint({ x: 1207, y: 893 }, candidates, opts(20))
      expect(result.kind).toBe('grid')
      expect(result.point).toEqual({ x: 1210, y: 890 })
    })

    it('não encaixa fora do limiar — o ponto vai para a grade, não para a parede', () => {
      // 190 cm abaixo da parede, com limiar de 5 cm: nada de "imã" à distância.
      const result = snapDraftPoint({ x: 340, y: 200 }, candidates, opts(5))
      expect(result.kind).toBe('grid')
    })

    it('com snap desligado, o ponto fica exatamente onde o usuário soltou', () => {
      const result = snapDraftPoint({ x: 397, y: 12 }, candidates, { ...opts(20), enabled: false })
      expect(result.kind).toBe('none')
      expect(result.point).toEqual({ x: 397, y: 12 })
    })
  })

  describe('limiar em função do zoom', () => {
    const candidates = collectSnapCandidates([wall()])

    it('o mesmo afastamento na tela encaixa em qualquer zoom', () => {
      // O canvas converte 8px de tela em cm dividindo pelo zoom: afastado, o limiar em cm é maior.
      const pxToCmAt = (zoom: number) => (8 / zoom / 50) * 100 // 50 px por metro
      // 15 cm da ponta da parede (400, 10) e 15 cm do eixo dela.
      const pointNearEndpoint = { x: 400, y: 25 }

      // Zoom 0.4: 8px de tela valem 40 cm de mundo — o ponto encaixa na extremidade.
      expect(snapDraftPoint(pointNearEndpoint, candidates, opts(pxToCmAt(0.4))).kind).toBe('endpoint')
      // Zoom 2: 8px valem 8 cm — o mesmo ponto já não alcança nada, e vai para a grade.
      expect(snapDraftPoint(pointNearEndpoint, candidates, opts(pxToCmAt(2))).kind).toBe('grid')
    })
  })

  describe('encaixe com objetos rotacionados', () => {
    it('encaixa na ponta de uma parede em diagonal', () => {
      const diagonal = wall({ id: 'w2', x: 0, y: 0, width: 400, length: 20, rotationDeg: 45 })
      const [, end] = getLinearEndpoints(diagonal)
      const candidates = collectSnapCandidates([diagonal])
      const result = snapDraftPoint({ x: end.x + 3, y: end.y - 2 }, candidates, opts(20))
      expect(result.kind).toBe('endpoint')
      expect(result.point.x).toBeCloseTo(end.x, 6)
      expect(result.point.y).toBeCloseTo(end.y, 6)
    })
  })

  describe('projeção sobre segmento', () => {
    it('limita a projeção às extremidades', () => {
      const a = { x: 0, y: 0 }
      const b = { x: 100, y: 0 }
      expect(closestPointOnSegment({ x: 50, y: 30 }, a, b)).toEqual({ x: 50, y: 0 })
      expect(closestPointOnSegment({ x: -40, y: 10 }, a, b)).toEqual({ x: 0, y: 0 })
      expect(closestPointOnSegment({ x: 180, y: 10 }, a, b)).toEqual({ x: 100, y: 0 })
    })
  })

  describe('candidatos coletados', () => {
    it('objetos não lineares entram só como centro', () => {
      const rack: LayoutObject = {
        id: 'r1',
        objectType: 'rack',
        category: 'storage',
        x: 100,
        y: 100,
        width: 270,
        length: 110,
        rotationDeg: 0,
        zIndex: 0,
        properties: {},
      }
      const candidates = collectSnapCandidates([rack])
      expect(candidates.endpoints).toHaveLength(0)
      expect(candidates.segments).toHaveLength(0)
      expect(candidates.centers).toEqual([{ x: 235, y: 155 }])
    })
  })
})
