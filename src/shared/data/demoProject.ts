import type { LayoutObject, ObjectCategory, ObjectTypeKey } from '../../types/layout'
import type { FlowConnection, FlowNode } from '../../types/flow'

/**
 * Projeto pronto para demonstrar o app — principalmente a aba 3D: porta-paletes com pallets
 * para pegar com a empilhadeira, áreas de processo e um Fluxo com etapas vinculadas ao Layout
 * (rotas animadas no 3D). Medidas em cm, como em todo LayoutObject.
 */
export const DEMO_PROJECT = { name: 'Projeto demonstrativo', widthM: 30, heightM: 24 }

function obj(
  id: string,
  objectType: ObjectTypeKey,
  category: ObjectCategory,
  x: number,
  y: number,
  width: number,
  length: number,
  rotationDeg = 0,
  properties: Record<string, unknown> = {},
  name?: string,
): LayoutObject {
  return { id, objectType, category, x, y, width, length, rotationDeg, zIndex: 0, properties, ...(name ? { name } : {}) }
}

export function buildDemoObjects(): LayoutObject[] {
  const objects = [
    obj('demo-area-receiving', 'area-receiving', 'area', 200, 1800, 800, 500, 0, {}, 'Recebimento'),
    obj('demo-area-shipping', 'area-shipping', 'area', 2200, 1800, 800, 500, 0, {}, 'Expedição'),
    obj('demo-area-picking', 'area', 'area', 1200, 200, 1000, 400, 0, { areaType: 'picking' }, 'Picking'),
    obj('demo-rack-1', 'rack', 'storage', 600, 800, 1080, 110, 0, { bays: 4, levels: 4 }, 'Rua A'),
    obj('demo-rack-2', 'rack', 'storage', 600, 1250, 1080, 110, 0, { bays: 4, levels: 4 }, 'Rua B'),
    obj('demo-rack-3', 'rack', 'storage', 2000, 900, 810, 110, 90, { bays: 3, levels: 3 }, 'Rua C'),
    obj('demo-shelf', 'shelf', 'storage', 200, 300, 300, 60, 0, { levels: 4 }),
    obj('demo-conveyor', 'conveyor', 'equipment', 1300, 700, 600, 80),
    obj('demo-forklift', 'forklift', 'equipment', 1500, 1600, 250, 120, 30),
    obj('demo-column', 'column', 'structure', 1800, 1500, 40, 40),
    obj('demo-wall', 'wall', 'structure', 0, 1400, 400, 20),
    obj('demo-dock', 'dock', 'structure', 400, 2370, 300, 30, 0, {}, 'Doca 1'),
    obj('demo-pedestrian', 'pedestrian-lane', 'flow', 50, 100, 120, 2200),
    obj('demo-packing', 'packing-table', 'equipment', 2400, 300, 200, 80),
    obj('demo-pallet-1', 'pallet', 'pallet', 1200, 2000, 100, 120),
    obj('demo-pallet-2', 'pallet', 'pallet', 1400, 2000, 100, 120),
  ]
  return objects.map((o, i) => ({ ...o, zIndex: i }))
}

export function buildDemoFlow(): { flowNodes: FlowNode[]; flowConnections: FlowConnection[] } {
  const flowNodes: FlowNode[] = [
    { id: 'demo-n-receiving', type: 'receiving', name: 'Recebimento', x: 40, y: 120, linkedObjectId: 'demo-area-receiving', capacity: 30, capacityUnit: 'pallets/h' },
    { id: 'demo-n-storage', type: 'storage', name: 'Armazenagem (Rua C)', x: 260, y: 120, linkedObjectId: 'demo-rack-3', capacity: 36, capacityUnit: 'posições' },
    { id: 'demo-n-picking', type: 'picking', name: 'Picking', x: 480, y: 120, linkedObjectId: 'demo-area-picking', capacity: 40, capacityUnit: 'pedidos/h' },
    { id: 'demo-n-shipping', type: 'shipping', name: 'Expedição', x: 700, y: 120, linkedObjectId: 'demo-area-shipping', capacity: 25, capacityUnit: 'pallets/h' },
  ]
  const flowConnections: FlowConnection[] = [
    { id: 'demo-c-1', fromNodeId: 'demo-n-receiving', toNodeId: 'demo-n-storage', flowType: 'forklift' },
    { id: 'demo-c-2', fromNodeId: 'demo-n-storage', toNodeId: 'demo-n-picking', flowType: 'pallet' },
    { id: 'demo-c-3', fromNodeId: 'demo-n-picking', toNodeId: 'demo-n-shipping', flowType: 'people' },
  ]
  return { flowNodes, flowConnections }
}
