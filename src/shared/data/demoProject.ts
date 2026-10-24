import type { LayoutObject, ObjectCategory, ObjectTypeKey } from '../../types/layout'
import type { FlowConnection, FlowNode } from '../../types/flow'

/**
 * Projeto pronto para demonstrar o app — principalmente a aba 3D: um centro de distribuição de
 * bebidas de 80 × 50 m, no estilo de um CD de cervejaria (sem marca): linhas de envase,
 * paletização, blocado de fardos/barris/engradados, drive-ins, 8 docas de expedição com carretas
 * sider e recebimento de vasilhame, além de um Fluxo com etapas vinculadas ao Layout.
 *
 * O arranjo segue as principais exigências de segurança brasileiras que têm reflexo no layout
 * (referência de demonstração, não laudo — a validação é do responsável técnico do projeto):
 * - NR-11 (movimentação e armazenagem): corredores de empilhadeira de 4 m, área própria para
 *   estacionamento/recarga, zona de manobra em cada doca.
 * - NR-12 item 12.2.1: vias de pedestres com 1,20 m, demarcadas e segregadas do tráfego de máquinas.
 * - NR-26 / ABNT NBR 7195: demarcações de circulação e zonas de risco.
 * - NR-23 + instruções técnicas do Corpo de Bombeiros: duas saídas de pessoas sinalizadas, rota de
 *   pedestres contínua, extintores a até 20 m, hidrantes e iluminação de emergência.
 * - NR-10/NR-11: lava-olhos junto à recarga de baterias.
 * Medidas em cm, como em todo LayoutObject.
 */
export const DEMO_PROJECT = {
  name: 'CD de Bebidas (demonstrativo)',
  widthM: 80,
  heightM: 50,
  description:
    'Centro de distribuição de bebidas de demonstração organizado conforme NR-11, NR-12 (vias de pessoas ≥ 1,20 m), ' +
    'NR-26 (demarcação) e NR-23 (saídas, extintores, hidrantes, iluminação de emergência). Referência ilustrativa: ' +
    'valide com o responsável técnico de segurança.',
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

/** Blocado 4 colunas × 2 filas, com corredores de 4 m entre os blocos. */
const BLOCK_COLS = [600, 2100, 3600, 5100]
const BLOCK_ROWS = [1820, 3020]
const BLOCK_W = 1100
const BLOCK_L = 800
const BLOCK_LOADS = [
  ['beverage', 'beverage', 'beverage', 'beverage'],
  ['beverage', 'beverage', 'kegs', 'crates'],
]
const BLOCK_NAMES = [
  ['Blocado A1 — fardos', 'Blocado A2 — fardos', 'Blocado A3 — fardos', 'Blocado A4 — fardos'],
  ['Blocado B1 — fardos', 'Blocado B2 — fardos', 'Blocado B3 — barris', 'Blocado B4 — vasilhame'],
]

export function buildDemoObjects(): LayoutObject[] {
  const objects: LayoutObject[] = [
    // --- Faixa superior: produção e apoio (áreas sem sobreposição entre si)
    obj('demo-area-filling', 'area', 'area', 200, 200, 2400, 1080, { areaType: 'custom' }, 'Linhas de envase'),
    obj('demo-area-palletizing', 'area', 'area', 2700, 200, 900, 1080, { areaType: 'staging' }, 'Paletização'),
    obj('demo-area-charging', 'area', 'area', 3700, 200, 1000, 1080, { areaType: 'custom' }, 'Recarga de baterias'),
    obj('demo-area-admin', 'area', 'area', 4800, 200, 1000, 1080, { areaType: 'administrative' }, 'Administrativo'),
    obj('demo-area-picking', 'area-picking', 'storage', 5900, 200, 1900, 1080, {}, 'Picking'),

    // --- Circulação: pedestres (NR-12 ≥ 1,20 m) e corredores de empilhadeira de 4 m
    obj('demo-walk-west', 'pedestrian-lane', 'flow', 30, 150, 120, 4830, { flowType: 'people' }, 'Rota de pedestres'),
    obj('demo-walk-north', 'pedestrian-lane', 'flow', 150, 1300, 7700, 120, { flowType: 'people' }, 'Passarela norte'),
    obj('demo-aisle-north', 'corridor', 'storage', 150, 1420, 7700, 400, { corridorType: 'forklift', direction: 'two-way' }, 'Corredor principal'),
    obj('demo-aisle-south', 'corridor', 'storage', 150, 3820, 7700, 400, { corridorType: 'forklift', direction: 'two-way' }, 'Corredor das docas'),
    obj('demo-aisle-mid', 'corridor', 'storage', 600, 2620, 5600, 400, { corridorType: 'forklift', direction: 'two-way' }, 'Corredor central'),
    obj('demo-aisle-west', 'corridor', 'storage', 160, 1820, 400, 2000, { corridorType: 'forklift', direction: 'one-way' }, 'Rua oeste'),
    obj('demo-aisle-1a', 'corridor', 'storage', 1700, 1820, 400, 800, { corridorType: 'forklift', direction: 'one-way' }, 'Rua 1 (norte)'),
    obj('demo-aisle-1b', 'corridor', 'storage', 1700, 3020, 400, 800, { corridorType: 'forklift', direction: 'one-way' }, 'Rua 1 (sul)'),
    obj('demo-aisle-2a', 'corridor', 'storage', 3200, 1820, 400, 800, { corridorType: 'forklift', direction: 'one-way' }, 'Rua 2 (norte)'),
    obj('demo-aisle-2b', 'corridor', 'storage', 3200, 3020, 400, 800, { corridorType: 'forklift', direction: 'one-way' }, 'Rua 2 (sul)'),
    obj('demo-aisle-3a', 'corridor', 'storage', 4700, 1820, 400, 800, { corridorType: 'forklift', direction: 'one-way' }, 'Rua 3 (norte)'),
    obj('demo-aisle-3b', 'corridor', 'storage', 4700, 3020, 400, 800, { corridorType: 'forklift', direction: 'one-way' }, 'Rua 3 (sul)'),
    obj('demo-aisle-east', 'corridor', 'storage', 6200, 1820, 400, 2000, { corridorType: 'forklift', direction: 'two-way' }, 'Rua dos drive-ins'),

    // --- Saídas de pessoas (duas, em lados opostos)
    obj('demo-exit-west', 'door', 'structure', 30, 4980, 120, 20, {}, 'Saída de pessoas oeste'),
    obj('demo-exit-north', 'door', 'structure', 5200, 0, 120, 20, {}, 'Saída de pessoas norte'),
    obj('demo-stairs', 'stairs', 'structure', 5600, 300, 120, 300, {}, 'Escada do mezanino'),

    // --- Linhas de envase e paletização
    obj('demo-line-1', 'conveyor', 'equipment', 400, 420, 2000, 80, {}, 'Linha de envase 1'),
    obj('demo-line-2', 'conveyor', 'equipment', 400, 720, 2000, 80, {}, 'Linha de envase 2'),
    obj('demo-line-3', 'conveyor', 'equipment', 400, 1020, 2000, 80, {}, 'Linha de envase 3'),
    obj('demo-pal-conveyor', 'conveyor', 'equipment', 2800, 720, 700, 80, {}, 'Transportador de paletização'),
    obj('demo-scale', 'scale', 'equipment', 2850, 400, 100, 100, {}, 'Balança de pallets'),
    obj('demo-pal-label', 'label-printer', 'equipment', 3100, 420, 45, 35),
    obj('demo-pal-out-1', 'pallet', 'pallet', 2850, 950, 100, 120, { load: 'beverage' }),
    obj('demo-pal-out-2', 'pallet', 'pallet', 3050, 950, 100, 120, { load: 'beverage' }),

    // --- Recarga de baterias: equipamentos estacionados fora das vias
    obj('demo-forklift-1', 'forklift', 'equipment', 3780, 300, 120, 230),
    obj('demo-forklift-2', 'forklift', 'equipment', 3950, 300, 120, 230),
    obj('demo-reach', 'reach-truck', 'equipment', 4120, 300, 115, 250),
    obj('demo-tug', 'tug', 'equipment', 4290, 300, 70, 130),
    obj('demo-jack', 'pallet-jack', 'equipment', 4410, 300, 68, 150),
    obj('demo-cart', 'platform-cart', 'equipment', 4530, 300, 80, 120),

    // --- Picking
    obj('demo-pick-conveyor', 'conveyor', 'equipment', 6000, 950, 1600, 80, {}, 'Esteira do picking'),
    obj('demo-packing-1', 'packing-table', 'equipment', 6000, 400, 150, 80),
    obj('demo-packing-2', 'packing-table', 'equipment', 6250, 400, 150, 80),
    obj('demo-sorting', 'sorting-bench', 'equipment', 6500, 400, 150, 70),
    obj('demo-label', 'label-printer', 'equipment', 6800, 420, 45, 35),
    obj('demo-rf', 'rf-scanner', 'equipment', 6900, 420, 35, 15),

    // --- Drive-ins de fardos
    obj('demo-drivein-1', 'drive-in', 'storage', 6600, 1820, 1200, 1000, { levels: 5, load: 'beverage' }, 'Drive-in 1'),
    obj('demo-drivein-2', 'drive-in', 'storage', 6600, 3000, 1200, 820, { levels: 5, load: 'beverage' }, 'Drive-in 2'),

    // --- Expedição (8 docas) e recebimento de vasilhame (2 docas), com zona de manobra em cada doca
    obj('demo-area-shipping', 'area-shipping', 'area', 600, 4240, 5000, 320, {}, 'Expedição'),
    obj('demo-area-receiving', 'area-receiving', 'area', 5900, 4240, 1900, 320, {}, 'Recebimento de vasilhame'),
    obj('demo-ship-pallet-1', 'pallet', 'pallet', 900, 4300, 100, 120, { load: 'beverage' }),
    obj('demo-ship-pallet-2', 'pallet', 'pallet', 1050, 4300, 100, 120, { load: 'beverage' }),
    obj('demo-ship-pallet-3', 'pallet', 'pallet', 1500, 4300, 100, 120, { load: 'kegs' }),
    obj('demo-recv-pallet-1', 'pallet', 'pallet', 6100, 4300, 100, 120, { load: 'crates' }),
    obj('demo-recv-pallet-2', 'pallet', 'pallet', 6250, 4300, 100, 120, { load: 'crates' }),

    // --- Combate a incêndio e emergência
    obj('demo-hydrant-1', 'fire-hydrant', 'safety', 7900, 2300, 90, 30, {}, 'Hidrante 1'),
    obj('demo-hydrant-2', 'fire-hydrant', 'safety', 7900, 3500, 90, 30, {}, 'Hidrante 2'),
    obj('demo-hydrant-3', 'fire-hydrant', 'safety', 2650, 1200, 90, 30, {}, 'Hidrante 3'),
    obj('demo-exit-sign-west', 'emergency-exit', 'safety', 60, 4940, 60, 20, {}, 'Saída'),
    obj('demo-exit-sign-west-2', 'emergency-exit', 'safety', 60, 2600, 60, 20, {}, 'Rota de fuga', 90),
    obj('demo-exit-sign-north', 'emergency-exit', 'safety', 5230, 40, 60, 20, {}, 'Saída'),
    obj('demo-light-1', 'emergency-light', 'safety', 70, 1000, 40, 15),
    obj('demo-light-2', 'emergency-light', 'safety', 70, 2500, 40, 15),
    obj('demo-light-3', 'emergency-light', 'safety', 70, 4000, 40, 15),
    obj('demo-light-4', 'emergency-light', 'safety', 2000, 1350, 40, 15),
    obj('demo-light-5', 'emergency-light', 'safety', 4500, 1350, 40, 15),
    obj('demo-light-6', 'emergency-light', 'safety', 7000, 1350, 40, 15),
    obj('demo-eyewash', 'eyewash', 'safety', 4600, 1100, 70, 70, {}, 'Lava-olhos (recarga)'),
    obj('demo-ext-filling-1', 'fire-extinguisher', 'safety', 600, 1150, 70, 70, { agent: 'abc' }, 'Extintor envase 1'),
    obj('demo-ext-filling-2', 'fire-extinguisher', 'safety', 2000, 1150, 70, 70, { agent: 'abc' }, 'Extintor envase 2'),
    obj('demo-ext-palletizing', 'fire-extinguisher', 'safety', 3400, 1150, 70, 70, { agent: 'abc' }, 'Extintor paletização'),
    obj('demo-ext-charging', 'fire-extinguisher', 'safety', 4100, 1150, 70, 70, { agent: 'co2' }, 'Extintor recarga'),
    obj('demo-ext-admin', 'fire-extinguisher', 'safety', 5300, 1150, 70, 70, { agent: 'abc' }, 'Extintor administrativo'),
    obj('demo-ext-picking', 'fire-extinguisher', 'safety', 7000, 1150, 70, 70, { agent: 'abc' }, 'Extintor picking'),
    obj('demo-ext-drivein', 'fire-extinguisher', 'safety', 7810, 2840, 70, 70, { agent: 'abc' }, 'Extintor drive-in'),
    obj('demo-ext-ship-1', 'fire-extinguisher', 'safety', 700, 4400, 70, 70, { agent: 'abc' }, 'Extintor expedição 1'),
    obj('demo-ext-ship-2', 'fire-extinguisher', 'safety', 3000, 4400, 70, 70, { agent: 'abc' }, 'Extintor expedição 2'),
    obj('demo-ext-ship-3', 'fire-extinguisher', 'safety', 5300, 4400, 70, 70, { agent: 'abc' }, 'Extintor expedição 3'),
    obj('demo-ext-recv', 'fire-extinguisher', 'safety', 7600, 4400, 70, 70, { agent: 'abc' }, 'Extintor recebimento'),
  ]

  // Blocados, cada um com uma coluna da estrutura (protegida) e um extintor no canto
  BLOCK_ROWS.forEach((y, r) =>
    BLOCK_COLS.forEach((x, c) => {
      objects.push(
        obj(`demo-block-${r}${c}`, 'storage-block', 'storage', x, y, BLOCK_W, BLOCK_L, { levels: 4, load: BLOCK_LOADS[r]![c], fill: 0.85 }, BLOCK_NAMES[r]![c]),
        obj(`demo-col-${r}${c}`, 'column', 'structure', x + 20, y + 20, 40, 40),
        obj(`demo-ext-block-${r}${c}`, 'fire-extinguisher', 'safety', x + 80, y + 10, 70, 70, { agent: 'abc' }, 'Extintor'),
      )
    }),
  )

  // Docas: 8 de expedição e 2 de recebimento, cada uma com zona de manobra à frente
  const docks = [...Array.from({ length: 8 }, (_, k) => ({ x: 800 + k * 600, name: `Doca E${k + 1}` })), { x: 6200, name: 'Doca R1' }, { x: 6900, name: 'Doca R2' }]
  docks.forEach((d, k) => {
    objects.push(
      obj(`demo-dock-${k}`, 'dock', 'structure', d.x, 4950, 350, 50, {}, d.name),
      obj(`demo-dock-zone-${k}`, 'safety-zone', 'flow', d.x - 50, 4580, 450, 340, {}, 'Zona de manobra'),
    )
  })

  return objects.map((o, i) => ({ ...o, zIndex: i }))
}

export function buildDemoFlow(): { flowNodes: FlowNode[]; flowConnections: FlowConnection[] } {
  const flowNodes: FlowNode[] = [
    { id: 'demo-n-filling', type: 'custom', name: 'Envase', x: 40, y: 120, linkedObjectId: 'demo-area-filling', capacity: 120, capacityUnit: 'pallets/h' },
    { id: 'demo-n-palletizing', type: 'staging', name: 'Paletização', x: 260, y: 120, linkedObjectId: 'demo-area-palletizing', capacity: 120, capacityUnit: 'pallets/h' },
    { id: 'demo-n-storage', type: 'storage', name: 'Blocado de fardos', x: 480, y: 120, linkedObjectId: 'demo-block-00', capacity: 1300, capacityUnit: 'posições' },
    { id: 'demo-n-picking', type: 'picking', name: 'Picking', x: 700, y: 120, linkedObjectId: 'demo-area-picking', capacity: 60, capacityUnit: 'pedidos/h' },
    { id: 'demo-n-shipping', type: 'shipping', name: 'Expedição', x: 920, y: 120, linkedObjectId: 'demo-area-shipping', capacity: 90, capacityUnit: 'pallets/h' },
    { id: 'demo-n-receiving', type: 'receiving', name: 'Recebimento de vasilhame', x: 480, y: 300, linkedObjectId: 'demo-area-receiving', capacity: 40, capacityUnit: 'pallets/h' },
    { id: 'demo-n-crates', type: 'storage', name: 'Vasilhame', x: 260, y: 300, linkedObjectId: 'demo-block-13', capacity: 300, capacityUnit: 'posições' },
  ]
  const flowConnections: FlowConnection[] = [
    { id: 'demo-c-1', fromNodeId: 'demo-n-filling', toNodeId: 'demo-n-palletizing', flowType: 'material', label: 'Esteira' },
    { id: 'demo-c-2', fromNodeId: 'demo-n-palletizing', toNodeId: 'demo-n-storage', flowType: 'forklift' },
    { id: 'demo-c-3', fromNodeId: 'demo-n-storage', toNodeId: 'demo-n-picking', flowType: 'pallet' },
    { id: 'demo-c-4', fromNodeId: 'demo-n-picking', toNodeId: 'demo-n-shipping', flowType: 'forklift' },
    { id: 'demo-c-5', fromNodeId: 'demo-n-storage', toNodeId: 'demo-n-shipping', flowType: 'forklift', label: 'Pallet fechado' },
    { id: 'demo-c-6', fromNodeId: 'demo-n-receiving', toNodeId: 'demo-n-crates', flowType: 'forklift' },
    { id: 'demo-c-7', fromNodeId: 'demo-n-crates', toNodeId: 'demo-n-filling', flowType: 'pallet', label: 'Vasilhame para envase' },
  ]
  return { flowNodes, flowConnections }
}
