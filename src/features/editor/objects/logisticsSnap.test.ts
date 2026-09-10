import { describe, expect, it } from 'vitest'
import { getLogisticsSnapLines } from './logisticsSnap'
import { resolveObjectSnap } from '../../../shared/lib/snap'
import { getBoundingBox } from '../../../shared/lib/geometry'
import type { LayoutObject, ObjectCategory, ObjectTypeKey } from '../../../types/layout'

function obj(
  objectType: ObjectTypeKey,
  category: ObjectCategory,
  x: number,
  y: number,
  width: number,
  length: number,
): LayoutObject {
  return { id: `${objectType}-${x}-${y}`, objectType, category, x, y, width, length, rotationDeg: 0, zIndex: 0, properties: {} }
}

const pallet = (x: number, y: number) => obj('pallet', 'pallet', x, y, 120, 100)
const rack = (x: number, y: number) => obj('rack', 'storage', x, y, 270, 110)
const forklift = (x: number, y: number) => obj('forklift', 'equipment', x, y, 220, 120)
const horizontalCorridor = (x: number, y: number) => obj('corridor', 'storage', x, y, 1200, 300)
const verticalCorridor = (x: number, y: number) => obj('corridor', 'storage', x, y, 300, 1200)

describe('snap logístico', () => {
  it('carga unitizada é atraída para o centro da estrutura de armazenagem', () => {
    const lines = getLogisticsSnapLines(pallet(300, 200), [rack(280, 180)])
    expect(lines.x).toEqual([415])
    expect(lines.y).toEqual([235])
  })

  it('equipamento é atraído para o eixo do corredor, no lado estreito', () => {
    const horizontal = getLogisticsSnapLines(forklift(400, 400), [horizontalCorridor(0, 300)])
    expect(horizontal.y).toEqual([450])
    expect(horizontal.x).toEqual([])

    const vertical = getLogisticsSnapLines(forklift(400, 400), [verticalCorridor(300, 0)])
    expect(vertical.x).toEqual([450])
    expect(vertical.y).toEqual([])
  })

  it('não inventa alvo para objeto sem significado logístico de encaixe', () => {
    const wall = obj('wall', 'structure', 0, 0, 400, 20)
    expect(getLogisticsSnapLines(wall, [rack(0, 0), horizontalCorridor(0, 0)])).toEqual({ x: [], y: [] })
  })

  it('ignora alvos distantes — o encaixe é contextual, não global', () => {
    const lines = getLogisticsSnapLines(pallet(0, 0), [rack(5000, 5000)])
    expect(lines).toEqual({ x: [], y: [] })
  })

  it('só o tipo compatível atrai: pallet não segue eixo de corredor nem rack atrai empilhadeira', () => {
    expect(getLogisticsSnapLines(pallet(400, 400), [horizontalCorridor(0, 300)])).toEqual({ x: [], y: [] })
    expect(getLogisticsSnapLines(forklift(300, 200), [rack(280, 180)])).toEqual({ x: [], y: [] })
  })

  it('as linhas logísticas entram no mesmo resolvedor, com o mesmo limiar', () => {
    const dragged = pallet(300, 200)
    const target = rack(280, 180)
    const lines = getLogisticsSnapLines(dragged, [target])

    // Sem as linhas logísticas não há alvo algum…
    const semLinhas = resolveObjectSnap(getBoundingBox(dragged), [], 20)
    expect(semLinhas.x).toBeUndefined()
    expect(semLinhas.y).toBeUndefined()

    // …com elas, alinha, e a guia aponta exatamente para o centro do rack.
    const comLinhas = resolveObjectSnap(getBoundingBox(dragged), [], 20, lines)
    expect(comLinhas.x?.guidePosition).toBe(415)
    expect(comLinhas.y?.guidePosition).toBe(235)
  })

  it('vence quando é o alvo mais próximo, e cede quando não é', () => {
    // O resolvedor continua honesto: ganha quem está mais perto. O alvo logístico acrescenta uma
    // possibilidade de encaixe que não existia (o centro da estrutura), não um imã privilegiado.
    const target = rack(280, 180) // centro (415, 235); arestas em Y: 180 e 290

    // Pallet quase centralizado no rack: o centro é o alvo mais próximo e vence.
    const centrado = pallet(295, 187) // centro Y = 237, a 2 cm do centro do rack
    const perto = resolveObjectSnap(
      getBoundingBox(centrado),
      [getBoundingBox(target)],
      20,
      getLogisticsSnapLines(centrado, [target]),
    )
    expect(perto.y?.guidePosition).toBe(235)

    // Pallet junto da borda inferior: ali a aresta está mais perto, e é ela que alinha.
    const naBorda = pallet(295, 200) // aresta inferior em 300, a 10 cm da aresta do rack
    const borda = resolveObjectSnap(
      getBoundingBox(naBorda),
      [getBoundingBox(target)],
      20,
      getLogisticsSnapLines(naBorda, [target]),
    )
    expect(borda.y?.guidePosition).toBe(290)
  })

  it('fora do limiar, as linhas logísticas não puxam nada', () => {
    const dragged = pallet(300, 200)
    const lines = getLogisticsSnapLines(dragged, [rack(280, 180)])
    expect(resolveObjectSnap(getBoundingBox(dragged), [], 2, lines).x).toBeUndefined()
  })
})
