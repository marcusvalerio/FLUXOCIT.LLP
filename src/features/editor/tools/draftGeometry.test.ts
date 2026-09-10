import { describe, expect, it } from 'vitest'
import {
  constrainAngle,
  distanceCm,
  formatDistance,
  rectFromPoints,
  snapPoint,
  wallFromPoints,
} from './draftGeometry'

describe('geometria das ferramentas de desenho', () => {
  describe('parede a partir de dois pontos', () => {
    it('desenha na horizontal com o comprimento do traço e a espessura pedida', () => {
      const wall = wallFromPoints({ x: 100, y: 200 }, { x: 500, y: 200 }, 20)
      expect(wall).not.toBeNull()
      expect(wall!.width).toBe(400)
      expect(wall!.length).toBe(20)
      expect(wall!.rotationDeg).toBe(0)
      // x/y são o canto do retângulo não rotacionado, centrado na linha desenhada
      expect(wall!.x).toBe(100)
      expect(wall!.y).toBe(190)
    })

    it('gira conforme o traço, mantendo o centro no meio do segmento', () => {
      const wall = wallFromPoints({ x: 0, y: 0 }, { x: 0, y: 300 }, 20)
      expect(wall!.rotationDeg).toBe(90)
      expect(wall!.width).toBe(300)
      expect(wall!.x + wall!.width / 2).toBe(0)
      expect(wall!.y + wall!.length / 2).toBe(150)
    })

    it('ignora um traço curto demais (clique, não desenho)', () => {
      expect(wallFromPoints({ x: 0, y: 0 }, { x: 4, y: 0 }, 20)).toBeNull()
    })
  })

  describe('área a partir de dois cantos', () => {
    it('funciona em qualquer direção de arraste', () => {
      const a = rectFromPoints({ x: 500, y: 400 }, { x: 100, y: 100 })
      expect(a).toEqual({ x: 100, y: 100, width: 400, length: 300, rotationDeg: 0 })
    })

    it('ignora retângulos degenerados', () => {
      expect(rectFromPoints({ x: 0, y: 0 }, { x: 400, y: 2 })).toBeNull()
    })
  })

  describe('trava de ângulo (Shift)', () => {
    it('leva um traço quase horizontal para exatamente 0°', () => {
      const end = constrainAngle({ x: 0, y: 0 }, { x: 300, y: 12 })
      expect(end.y).toBeCloseTo(0, 6)
      expect(end.x).toBeCloseTo(Math.hypot(300, 12), 6)
    })

    it('preserva o comprimento ao travar em 45°', () => {
      const start = { x: 0, y: 0 }
      const end = constrainAngle(start, { x: 100, y: 96 })
      expect(distanceCm(start, end)).toBeCloseTo(distanceCm(start, { x: 100, y: 96 }), 6)
      expect(end.x).toBeCloseTo(end.y, 6)
    })
  })

  describe('snap de grade nas extremidades', () => {
    it('ajusta o ponto ao passo da grade quando ligado', () => {
      expect(snapPoint({ x: 107, y: 193 }, 10, true)).toEqual({ x: 110, y: 190 })
    })

    it('não altera nada com o snap desligado', () => {
      expect(snapPoint({ x: 107, y: 193 }, 10, false)).toEqual({ x: 107, y: 193 })
    })
  })

  describe('medição', () => {
    it('mede em escala real e formata em metros', () => {
      expect(distanceCm({ x: 0, y: 0 }, { x: 300, y: 400 })).toBe(500)
      expect(formatDistance(500)).toBe('5.00 m')
      expect(formatDistance(480)).toBe('4.80 m')
    })

    it('usa centímetros abaixo de um metro', () => {
      expect(formatDistance(42)).toBe('42 cm')
    })
  })
})
