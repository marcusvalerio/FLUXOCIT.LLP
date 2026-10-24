import type { LayoutObject, ObjectCategory, ObjectTypeKey } from '../../types/layout'
import type { FlowConnection, FlowNode } from '../../types/flow'

/**
 * Projeto pronto para demonstrar o app — principalmente a aba 3D: um CD pequeno com porta-paletes,
 * picking, expedição/recebimento com docas, pátio de contêineres, devolução com gaiolas aramadas e
 * uma área de recarga de equipamentos, além de um Fluxo com etapas vinculadas ao Layout.
 *
 * O arranjo segue as principais exigências de segurança brasileiras que têm reflexo no layout
 * (referência de demonstração, não laudo — a validação é do responsável técnico do projeto):
 * - NR-11 (movimentação e armazenagem): corredores de empilhadeira dimensionados para a máquina,
 *   sentido único sinalizado, área própria para estacionamento/recarga, zona de manobra nas docas.
 * - NR-12 item 12.2.1: vias principais de circulação de pessoas com no mínimo 1,20 m, demarcadas
 *   e segregadas do tráfego de máquinas; travessia sinalizada onde a faixa cruza o corredor.
 * - NR-26 / ABNT NBR 7195: demarcações em amarelo para circulação e zonas de risco.
 * - NR-23 + instruções técnicas do Corpo de Bombeiros: rota de pedestres contínua até a porta de
 *   pessoas (saída) e corredores livres de obstáculos.
 * - ABNT NBR 15524 (porta-paletes): colunas protegidas e ruas com acesso pelos dois lados.
 * Medidas em cm, como em todo LayoutObject.
 */
export const DEMO_PROJECT = {
  name: 'Projeto demonstrativo',
  widthM: 36,
  heightM: 26,
  description:
    'CD de demonstração organizado conforme NR-11, NR-12 (vias de pessoas ≥ 1,20 m), NR-26 (demarcação) e NR-23 ' +
    '(rota até a saída). Referência ilustrativa: valide com o responsável técnico de segurança.',
}

function obj(
  id: string,
  objectType: ObjectTypeKey,
  category: ObjectCategory,
  x: number,
  y: number,
  width: number,
  length: number,
  properties: Record<string, unknown> = {},
  name?: string,
  rotationDeg = 0,
): LayoutObject {
  return { id, objectType, category, x, y, width, length, rotationDeg, zIndex: 0, properties, ...(name ? { name } : {}) }
}

export function buildDemoObjects(): LayoutObject[] {
  const objects: LayoutObject[] = [
    // --- Áreas operacionais (sem sobreposição entre si nem sobre as docas)
    obj('demo-area-admin', 'area', 'area', 200, 100, 1100, 450, { areaType: 'administrative' }, 'Administrativo'),
    obj('demo-area-picking', 'area-picking', 'storage', 1900, 100, 800, 500, {}, 'Picking'),
    obj('demo-area-yard', 'area', 'area', 2800, 100, 700, 900, { areaType: 'custom' }, 'Pátio de contêineres'),
    obj('demo-area-returns', 'area', 'area', 1900, 800, 800, 500, { areaType: 'returns' }, 'Devolução / Quarentena'),
    obj('demo-area-charging', 'area', 'area', 2800, 1150, 700, 550, { areaType: 'custom' }, 'Estacionamento e recarga de baterias'),
    obj('demo-area-shipping', 'area-shipping', 'area', 1900, 1900, 800, 480, {}, 'Expedição'),
    obj('demo-area-receiving', 'area-receiving', 'area', 2800, 1900, 700, 480, {}, 'Recebimento'),

    // --- Armazenagem: 4 ruas de porta-paletes (B e C costas com costas) e corredores de 3,50 m
    obj('demo-rack-a', 'rack', 'storage', 400, 800, 1080, 110, { bays: 4, levels: 4 }, 'Rua A'),
    obj('demo-rack-b', 'rack', 'storage', 400, 1260, 1080, 110, { bays: 4, levels: 4 }, 'Rua B'),
    obj('demo-rack-c', 'rack', 'storage', 400, 1370, 1080, 110, { bays: 4, levels: 4 }, 'Rua C'),
    obj('demo-rack-d', 'rack', 'storage', 400, 1830, 1080, 110, { bays: 4, levels: 4 }, 'Rua D'),
    obj('demo-aisle-1', 'corridor', 'storage', 400, 910, 1080, 350, { corridorType: 'forklift', direction: 'one-way' }, 'Corredor 1'),
    obj('demo-aisle-2', 'corridor', 'storage', 400, 1480, 1080, 350, { corridorType: 'forklift', direction: 'one-way' }, 'Corredor 2'),
    obj('demo-aisle-main', 'corridor', 'storage', 1500, 800, 350, 1700, { corridorType: 'forklift', direction: 'two-way' }, 'Corredor principal'),
    obj('demo-arrow-1', 'directional-arrow', 'flow', 900, 1065, 80, 40),
    obj('demo-arrow-2', 'directional-arrow', 'flow', 900, 1635, 80, 40, {}, undefined, 180),

    // --- Circulação de pessoas (NR-12: ≥ 1,20 m, segregada) e travessia sinalizada
    obj('demo-walk-west', 'pedestrian-lane', 'flow', 30, 100, 120, 2480, { flowType: 'people' }, 'Rota de pedestres'),
    obj('demo-walk-north', 'pedestrian-lane', 'flow', 150, 620, 1700, 120, { flowType: 'people' }, 'Acesso ao picking'),
    obj('demo-crossing', 'intersection', 'flow', 1500, 620, 350, 120, {}, 'Travessia de pedestres'),
    obj('demo-exit', 'door', 'structure', 30, 2580, 120, 20, {}, 'Saída de pessoas'),
    obj('demo-stairs', 'stairs', 'structure', 1100, 130, 120, 300, {}, 'Escada do mezanino'),

    // --- Estrutura
    obj('demo-col-1', 'column', 'structure', 1650, 400, 40, 40),
    obj('demo-col-2', 'column', 'structure', 2750, 1800, 40, 40),

    // --- Docas e zonas de manobra
    obj('demo-dock-ship', 'dock', 'structure', 2125, 2550, 350, 50, {}, 'Doca E1'),
    obj('demo-dock-recv', 'dock', 'structure', 2975, 2550, 350, 50, {}, 'Doca R1'),
    obj('demo-safety-ship', 'safety-zone', 'flow', 2075, 2400, 450, 140, {}, 'Zona de manobra'),
    obj('demo-safety-recv', 'safety-zone', 'flow', 2925, 2400, 450, 140, {}, 'Zona de manobra'),

    // --- Picking
    obj('demo-conveyor', 'conveyor', 'equipment', 2000, 480, 600, 80),
    obj('demo-packing', 'packing-table', 'equipment', 2000, 180, 150, 80),
    obj('demo-sorting', 'sorting-bench', 'equipment', 2250, 180, 150, 70),
    obj('demo-label', 'label-printer', 'equipment', 2480, 200, 45, 35),
    obj('demo-rf', 'rf-scanner', 'equipment', 2560, 200, 35, 15),

    // --- Pátio de contêineres
    obj('demo-container-1', 'container', 'pallet', 2850, 180, 606, 244, {}, 'Contêiner'),
    obj('demo-container-2', 'container', 'pallet', 2850, 600, 606, 244, {}, 'Contêiner'),

    // --- Devolução / quarentena: gaiolas aramadas
    obj('demo-cage-1', 'cage-pallet', 'pallet', 2000, 900, 120, 100),
    obj('demo-cage-2', 'cage-pallet', 'pallet', 2180, 900, 120, 100),
    obj('demo-cage-3', 'cage-pallet', 'pallet', 2360, 900, 120, 100),
    obj('demo-cage-4', 'cage-pallet', 'pallet', 2000, 1080, 120, 100),

    // --- Estacionamento e recarga: equipamentos parados fora das vias
    obj('demo-forklift', 'forklift', 'equipment', 2880, 1250, 120, 230),
    obj('demo-reach', 'reach-truck', 'equipment', 3080, 1250, 115, 250),
    obj('demo-jack', 'pallet-jack', 'equipment', 3280, 1250, 68, 150),
    obj('demo-tug', 'tug', 'equipment', 3380, 1250, 70, 130),
    obj('demo-cart', 'platform-cart', 'equipment', 3280, 1480, 80, 120),

    // --- Recebimento e expedição
    obj('demo-scale', 'scale', 'equipment', 3300, 2000, 100, 100),
    obj('demo-pallet-1', 'pallet', 'pallet', 2900, 2050, 100, 120),
    obj('demo-pallet-2', 'pallet', 'pallet', 3050, 2050, 100, 120),
    obj('demo-box-1', 'box', 'pallet', 2000, 2000, 60, 40),
    obj('demo-box-2', 'box', 'pallet', 2080, 2000, 60, 40),
    obj('demo-box-3', 'box', 'pallet', 2000, 2060, 80, 60),
  ]
  return objects.map((o, i) => ({ ...o, zIndex: i }))
}

export function buildDemoFlow(): { flowNodes: FlowNode[]; flowConnections: FlowConnection[] } {
  const flowNodes: FlowNode[] = [
    { id: 'demo-n-receiving', type: 'receiving', name: 'Recebimento', x: 40, y: 120, linkedObjectId: 'demo-area-receiving', capacity: 30, capacityUnit: 'pallets/h' },
    { id: 'demo-n-storage', type: 'storage', name: 'Armazenagem (Rua A)', x: 260, y: 120, linkedObjectId: 'demo-rack-a', capacity: 32, capacityUnit: 'posições' },
    { id: 'demo-n-picking', type: 'picking', name: 'Picking', x: 480, y: 120, linkedObjectId: 'demo-area-picking', capacity: 40, capacityUnit: 'pedidos/h' },
    { id: 'demo-n-shipping', type: 'shipping', name: 'Expedição', x: 700, y: 120, linkedObjectId: 'demo-area-shipping', capacity: 25, capacityUnit: 'pallets/h' },
    { id: 'demo-n-returns', type: 'returns', name: 'Devolução', x: 260, y: 280, linkedObjectId: 'demo-area-returns', capacity: 10, capacityUnit: 'caixas/h' },
  ]
  const flowConnections: FlowConnection[] = [
    { id: 'demo-c-1', fromNodeId: 'demo-n-receiving', toNodeId: 'demo-n-storage', flowType: 'forklift' },
    { id: 'demo-c-2', fromNodeId: 'demo-n-storage', toNodeId: 'demo-n-picking', flowType: 'pallet' },
    { id: 'demo-c-3', fromNodeId: 'demo-n-picking', toNodeId: 'demo-n-shipping', flowType: 'people' },
    { id: 'demo-c-4', fromNodeId: 'demo-n-receiving', toNodeId: 'demo-n-returns', flowType: 'pallet' },
    { id: 'demo-c-5', fromNodeId: 'demo-n-returns', toNodeId: 'demo-n-storage', flowType: 'forklift', label: 'Reintegração ao estoque' },
  ]
  return { flowNodes, flowConnections }
}
