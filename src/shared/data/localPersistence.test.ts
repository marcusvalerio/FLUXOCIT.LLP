import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalLayoutRepository } from './LocalLayoutRepository'
import { layoutRepository } from './repository'
import { apiFetch } from './apiClient'
import type { LayoutObject } from '../../types/layout'
import type { FlowConnection, FlowNode } from '../../types/flow'

function pallet(id: string, x: number, y: number): LayoutObject {
  return {
    id,
    objectType: 'pallet',
    category: 'pallet',
    x,
    y,
    width: 120,
    length: 100,
    rotationDeg: 0,
    zIndex: 1,
    properties: {},
  }
}

const flowNodes: FlowNode[] = [
  { id: 'n1', type: 'receiving', name: 'Recebimento', x: 0, y: 0 },
  { id: 'n2', type: 'storage', name: 'Armazenagem', x: 400, y: 0 },
]
const flowConnections: FlowConnection[] = [
  { id: 'c1', fromNodeId: 'n1', toNodeId: 'n2', flowType: 'pallet' },
]

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * Fluxo de aceite da versão local (sem conta): criar projeto → editar layout → editar Fluxo →
 * sair → reabrir → dados preservados. Tudo através da facade `layoutRepository`, que é o que as
 * telas realmente usam — então este teste falha se o backend ativo deixar de ser o local.
 */
describe('persistência local — fluxo completo sem conta', () => {
  it('preserva layout e Fluxo depois de "fechar e reabrir" o app', async () => {
    const created = await layoutRepository.createLayout({
      name: 'CD São Paulo',
      description: 'Galpão 1',
      widthM: 40,
      heightM: 25,
    })

    await layoutRepository.saveLayoutObjects(created.id, [pallet('o1', 100, 200)])
    await layoutRepository.saveFlowBoard(created.id, flowNodes, flowConnections)
    await layoutRepository.updateLayoutSettings(created.id, { widthM: 50 })

    // "Reabrir o app": uma instância nova só consegue ver o que foi realmente gravado no
    // localStorage — nada de estado em memória sobrevivendo entre as duas.
    const reopened = await new LocalLayoutRepository().getLayout(created.id)

    expect(reopened).not.toBeNull()
    expect(reopened?.name).toBe('CD São Paulo')
    expect(reopened?.description).toBe('Galpão 1')
    expect(reopened?.widthM).toBe(50)
    expect(reopened?.heightM).toBe(25)
    expect(reopened?.objects).toHaveLength(1)
    expect(reopened?.objects[0]).toMatchObject({ id: 'o1', objectType: 'pallet', x: 100, y: 200 })
    expect(reopened?.flowNodes).toHaveLength(2)
    expect(reopened?.flowConnections).toEqual(flowConnections)
  })

  it('salvar o Layout não apaga o Fluxo, e vice-versa (autosaves independentes)', async () => {
    const created = await layoutRepository.createLayout({ name: 'Projeto' })

    await layoutRepository.saveFlowBoard(created.id, flowNodes, flowConnections)
    await layoutRepository.saveLayoutObjects(created.id, [pallet('o1', 0, 0)])

    const reopened = await new LocalLayoutRepository().getLayout(created.id)
    expect(reopened?.objects).toHaveLength(1)
    expect(reopened?.flowNodes).toHaveLength(2)
  })

  it('lista, renomeia, duplica e exclui projetos sem conta', async () => {
    const a = await layoutRepository.createLayout({ name: 'A' })
    await layoutRepository.saveLayoutObjects(a.id, [pallet('o1', 0, 0)])

    await layoutRepository.renameLayout(a.id, 'A renomeado')
    const copy = await layoutRepository.duplicateLayout(a.id)

    expect(copy.id).not.toBe(a.id)
    expect(copy.name).toBe('A renomeado (cópia)')
    expect(copy.objects).toHaveLength(1)
    expect(await layoutRepository.listLayouts()).toHaveLength(2)

    await layoutRepository.deleteLayout(a.id)
    const remaining = await layoutRepository.listLayouts()
    expect(remaining.map((l) => l.id)).toEqual([copy.id])
  })

  it('nunca toca a rede: o fluxo inteiro roda sem fetch', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const created = await layoutRepository.createLayout({ name: 'Sem rede' })
    await layoutRepository.saveLayoutObjects(created.id, [pallet('o1', 0, 0)])
    await layoutRepository.saveFlowBoard(created.id, flowNodes, flowConnections)
    await layoutRepository.listLayouts()
    await layoutRepository.getLayout(created.id)
    await layoutRepository.deleteLayout(created.id)

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('apiClient sem VITE_API_BASE_URL', () => {
  it('falha localmente em vez de chamar um host chutado (localhost:8787)', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await expect(apiFetch('/api/auth/me')).rejects.toThrow(/VITE_API_BASE_URL/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
