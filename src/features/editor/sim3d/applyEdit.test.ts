import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../state/useEditorStore'
import { applyEditFrom3D } from './applyEdit'
import type { Layout } from '../../../types/layout'

function layoutWithRack(): Layout {
  return {
    id: 'layout-1',
    organizationId: 'local',
    name: 'Teste 3D',
    scalePxPerMeter: 50,
    gridStepM: 0.1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objects: [
      { id: 'rack-1', objectType: 'rack', category: 'storage', x: 100, y: 200, width: 270, length: 110, rotationDeg: 0, zIndex: 0, properties: {} },
    ],
  }
}

const rack = () => useEditorStore.getState().objects.find((o) => o.id === 'rack-1')

beforeEach(() => {
  useEditorStore.getState().loadLayout(layoutWithRack())
})

describe('edição vinda da aba 3D', () => {
  it('move, gira e desfaz pelo mesmo histórico do 2D', () => {
    applyEditFrom3D({ op: 'move', id: 'rack-1', x: 500, y: 600 })
    expect(rack()).toMatchObject({ x: 500, y: 600 })

    applyEditFrom3D({ op: 'rotate', id: 'rack-1', deltaDeg: 90 })
    expect(rack()?.rotationDeg).toBe(90)

    applyEditFrom3D({ op: 'undo' })
    expect(rack()?.rotationDeg).toBe(0)
    applyEditFrom3D({ op: 'undo' })
    expect(rack()).toMatchObject({ x: 100, y: 200 })
  })

  it('adiciona, duplica e exclui objetos', () => {
    applyEditFrom3D({ op: 'add', objectType: 'pallet', x: 1000, y: 1000 })
    expect(useEditorStore.getState().objects).toHaveLength(2)

    applyEditFrom3D({ op: 'duplicate', id: 'rack-1' })
    expect(useEditorStore.getState().objects).toHaveLength(3)

    applyEditFrom3D({ op: 'delete', id: 'rack-1' })
    expect(rack()).toBeUndefined()
  })

  it('ignora mensagens inválidas', () => {
    applyEditFrom3D({ op: 'move', id: 'nao-existe', x: 1, y: 1 })
    applyEditFrom3D({ op: 'move', id: 'rack-1', x: Number.NaN, y: 1 })
    applyEditFrom3D({ op: 'add', objectType: 'toString', x: 1, y: 1 })
    applyEditFrom3D({ op: 'add', objectType: 'nave-espacial', x: 1, y: 1 })
    expect(useEditorStore.getState().objects).toHaveLength(1)
    expect(rack()).toMatchObject({ x: 100, y: 200 })
  })

  it('sincroniza a seleção', () => {
    applyEditFrom3D({ op: 'select', id: 'rack-1' })
    expect(useEditorStore.getState().selectedIds).toEqual(['rack-1'])
    applyEditFrom3D({ op: 'select', id: null })
    expect(useEditorStore.getState().selectedIds).toEqual([])
  })
})
