import type { ObjectTypeKey } from '../../../types/layout'
import { AREA_TYPE_LABELS } from '../../../shared/lib/colors'
import { getRecommendedCorridorWidthCm } from '../../../shared/lib/spatialRules'
import { Area } from './renderers/Area'
import { AreaInspection } from './renderers/AreaInspection'
import { AreaPicking } from './renderers/AreaPicking'
import { AreaReceiving } from './renderers/AreaReceiving'
import { AreaShipping } from './renderers/AreaShipping'
import { AreaStaging } from './renderers/AreaStaging'
import { Box } from './renderers/Box'
import { CagePallet } from './renderers/CagePallet'
import { Cantilever } from './renderers/Cantilever'
import { Column } from './renderers/Column'
import { Container } from './renderers/Container'
import { Corridor } from './renderers/Corridor'
import { Conveyor } from './renderers/Conveyor'
import { DirectionalArrow } from './renderers/DirectionalArrow'
import { Dock } from './renderers/Dock'
import { Door } from './renderers/Door'
import { DriveIn } from './renderers/DriveIn'
import { FlowRack } from './renderers/FlowRack'
import { FlowRoute } from './renderers/FlowRoute'
import { Forklift } from './renderers/Forklift'
import { Gate } from './renderers/Gate'
import { Intersection } from './renderers/Intersection'
import { LabelPrinter } from './renderers/LabelPrinter'
import { OrderPicker } from './renderers/OrderPicker'
import { PackingTable } from './renderers/PackingTable'
import { Pallet } from './renderers/Pallet'
import { PalletJack } from './renderers/PalletJack'
import { PedestrianLane } from './renderers/PedestrianLane'
import { PlatformCart } from './renderers/PlatformCart'
import { PushBack } from './renderers/PushBack'
import { Rack } from './renderers/Rack'
import { ReachTruck } from './renderers/ReachTruck'
import { RfScanner } from './renderers/RfScanner'
import { SafetyZone } from './renderers/SafetyZone'
import { Scale } from './renderers/Scale'
import { Shelf } from './renderers/Shelf'
import { SortingBench } from './renderers/SortingBench'
import { Stairs } from './renderers/Stairs'
import { StorageBlock } from './renderers/StorageBlock'
import { TrafficLane } from './renderers/TrafficLane'
import { Tug } from './renderers/Tug'
import { Wall } from './renderers/Wall'
import type { ObjectTypeDefinition, PropertyFieldDefinition } from './types'

const BASE_FIELDS: PropertyFieldDefinition[] = [
  { key: 'name', label: 'Nome', kind: 'text' },
  { key: 'x', label: 'Posição X', kind: 'number-m', step: 0.05 },
  { key: 'y', label: 'Posição Y', kind: 'number-m', step: 0.05 },
  { key: 'rotationDeg', label: 'Rotação', kind: 'number-deg', step: 15 },
]

const DIMENSION_FIELDS: PropertyFieldDefinition[] = [
  { key: 'width', label: 'Largura', kind: 'number-m', min: 0.1, step: 0.1 },
  { key: 'length', label: 'Comprimento', kind: 'number-m', min: 0.1, step: 0.1 },
]

/** Free-text warehouse location code (e.g. "A-01-03") — see docs/BUSINESS_RULES.md § Endereçamento. */
const ADDRESS_FIELD: PropertyFieldDefinition = {
  key: 'code',
  label: 'Endereço/Código',
  kind: 'text',
}

/** Asset tag / equipment identification, independent of the free-text name. */
const EQUIPMENT_CODE_FIELD: PropertyFieldDefinition = {
  key: 'code',
  label: 'Identificação',
  kind: 'text',
}

/** Mobile-equipment specs (P8 — "preparar propriedades para validações automáticas futuras",
 * ver docs/BUSINESS_RULES.md § Regras espaciais). Purely informational for now — nothing reads
 * these yet to block placement — but captured on the object so a future spatial-rules pass
 * (raio de giro livre, corredor com largura mínima compatível) doesn't need a data migration. */
const EQUIPMENT_SPEC_FIELDS: PropertyFieldDefinition[] = [
  { key: 'capacityKg', label: 'Capacidade', kind: 'number-plain', unit: 'kg', min: 0, step: 50 },
  { key: 'turningRadiusM', label: 'Raio de giro', kind: 'number-plain', unit: 'm', min: 0, step: 0.1 },
  { key: 'minAisleWidthM', label: 'Largura mín. de corredor', kind: 'number-plain', unit: 'm', min: 0, step: 0.1 },
]

const LEVEL_OPTIONS = ['1', '2', '3', '4', '5', '6'].map((v) => ({ value: v, label: v }))

const AREA_TYPE_OPTIONS = Object.entries(AREA_TYPE_LABELS).map(([value, label]) => ({ value, label }))

const FLOW_TYPE_OPTIONS = [
  { value: 'people', label: 'Pessoas' },
  { value: 'forklift', label: 'Empilhadeiras' },
  { value: 'material', label: 'Materiais' },
]

/** Corridor traffic type — drives the recommended minimum width used by
 * spatialRules.findNarrowCorridors (Fase 8 § Corredores inteligentes). */
const CORRIDOR_TYPE_OPTIONS = [
  { value: 'pedestrian', label: 'Pedestres' },
  { value: 'forklift', label: 'Empilhadeira' },
  { value: 'mixed', label: 'Misto' },
  { value: 'pallets', label: 'Pallets' },
  { value: 'picking', label: 'Picking' },
]

const CORRIDOR_DIRECTION_OPTIONS = [
  { value: 'two-way', label: 'Mão dupla' },
  { value: 'one-way', label: 'Mão única' },
]

export const OBJECT_CATALOG: Record<ObjectTypeKey, ObjectTypeDefinition> = {
  wall: {
    key: 'wall',
    category: 'structure',
    label: 'Parede',
    defaultWidth: 300,
    defaultLength: 20,
    resizable: true,
    render: Wall,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  door: {
    key: 'door',
    category: 'structure',
    label: 'Porta',
    defaultWidth: 100,
    defaultLength: 20,
    resizable: true,
    render: Door,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  dock: {
    key: 'dock',
    category: 'structure',
    label: 'Doca',
    defaultWidth: 350,
    defaultLength: 50,
    resizable: true,
    render: Dock,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  rack: {
    key: 'rack',
    category: 'storage',
    label: 'Porta-paletes',
    defaultWidth: 270,
    defaultLength: 110,
    resizable: true,
    render: Rack,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      { key: 'bays', label: 'Vãos', kind: 'select', options: LEVEL_OPTIONS },
      { key: 'levels', label: 'Níveis', kind: 'select', options: LEVEL_OPTIONS },
      {
        key: 'capacity',
        label: 'Capacidade (posições)',
        kind: 'info',
        compute: (obj) => {
          const bays = Number(obj.properties.bays ?? 3)
          const levels = Number(obj.properties.levels ?? 3)
          return String(bays * levels)
        },
      },
    ],
    defaultProperties: { bays: 3, levels: 3 },
  },
  corridor: {
    key: 'corridor',
    category: 'storage',
    label: 'Corredor',
    defaultWidth: 300,
    defaultLength: 150,
    resizable: true,
    render: Corridor,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      { key: 'corridorType', label: 'Tipo de corredor', kind: 'select', options: CORRIDOR_TYPE_OPTIONS },
      { key: 'direction', label: 'Sentido', kind: 'select', options: CORRIDOR_DIRECTION_OPTIONS },
      {
        key: 'minWidthHint',
        label: 'Largura mín. recomendada',
        kind: 'info',
        compute: (obj) => `${(getRecommendedCorridorWidthCm(obj.properties.corridorType) / 100).toFixed(2)} m`,
      },
    ],
    defaultProperties: { corridorType: 'mixed', direction: 'two-way' },
  },
  pallet: {
    key: 'pallet',
    category: 'pallet',
    label: 'Pallet',
    defaultWidth: 120,
    defaultLength: 100,
    resizable: false,
    render: Pallet,
    propertyFields: [...BASE_FIELDS],
  },
  forklift: {
    key: 'forklift',
    category: 'equipment',
    label: 'Empilhadeira',
    defaultWidth: 120,
    defaultLength: 230,
    resizable: false,
    render: Forklift,
    propertyFields: [...BASE_FIELDS, EQUIPMENT_CODE_FIELD, ...EQUIPMENT_SPEC_FIELDS],
  },
  'pallet-jack': {
    key: 'pallet-jack',
    category: 'equipment',
    label: 'Paleteira',
    defaultWidth: 68,
    defaultLength: 150,
    resizable: false,
    render: PalletJack,
    propertyFields: [...BASE_FIELDS, EQUIPMENT_CODE_FIELD, ...EQUIPMENT_SPEC_FIELDS],
  },
  area: {
    key: 'area',
    category: 'area',
    label: 'Área',
    defaultWidth: 400,
    defaultLength: 400,
    resizable: true,
    render: Area,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      { key: 'areaType', label: 'Tipo de área', kind: 'select', options: AREA_TYPE_OPTIONS },
      ADDRESS_FIELD,
      {
        key: 'size',
        label: 'Área',
        kind: 'info',
        compute: (obj) => `${((obj.width / 100) * (obj.length / 100)).toFixed(1)} m²`,
      },
    ],
    defaultProperties: { areaType: 'storage' },
  },
  'flow-route': {
    key: 'flow-route',
    category: 'flow',
    label: 'Fluxo',
    defaultWidth: 400,
    defaultLength: 20,
    resizable: true,
    render: FlowRoute,
    propertyFields: [
      ...BASE_FIELDS,
      { key: 'width', label: 'Comprimento', kind: 'number-m', min: 0.2, step: 0.1 },
      { key: 'flowType', label: 'Tipo de fluxo', kind: 'select', options: FLOW_TYPE_OPTIONS },
    ],
    defaultProperties: { flowType: 'people' },
  },

  // --- Armazenagem (Fase 3) ---
  shelf: {
    key: 'shelf',
    category: 'storage',
    label: 'Estante',
    defaultWidth: 100,
    defaultLength: 40,
    resizable: true,
    render: Shelf,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      { key: 'levels', label: 'Níveis', kind: 'select', options: LEVEL_OPTIONS },
    ],
    defaultProperties: { levels: 4 },
  },
  'storage-block': {
    key: 'storage-block',
    category: 'storage',
    label: 'Bloco de armazenagem',
    defaultWidth: 200,
    defaultLength: 200,
    resizable: true,
    render: StorageBlock,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      {
        key: 'size',
        label: 'Área',
        kind: 'info',
        compute: (obj) => `${((obj.width / 100) * (obj.length / 100)).toFixed(1)} m²`,
      },
    ],
  },
  'area-picking': {
    key: 'area-picking',
    category: 'storage',
    label: 'Área de picking',
    defaultWidth: 300,
    defaultLength: 300,
    resizable: true,
    render: AreaPicking,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      {
        key: 'size',
        label: 'Área',
        kind: 'info',
        compute: (obj) => `${((obj.width / 100) * (obj.length / 100)).toFixed(1)} m²`,
      },
    ],
  },
  'area-staging': {
    key: 'area-staging',
    category: 'storage',
    label: 'Área de staging',
    defaultWidth: 300,
    defaultLength: 300,
    resizable: true,
    render: AreaStaging,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      {
        key: 'size',
        label: 'Área',
        kind: 'info',
        compute: (obj) => `${((obj.width / 100) * (obj.length / 100)).toFixed(1)} m²`,
      },
    ],
  },

  // --- Operação (Fase 3) ---
  conveyor: {
    key: 'conveyor',
    category: 'equipment',
    label: 'Esteira transportadora',
    defaultWidth: 200,
    defaultLength: 50,
    resizable: true,
    render: Conveyor,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS, EQUIPMENT_CODE_FIELD],
  },
  'sorting-bench': {
    key: 'sorting-bench',
    category: 'equipment',
    label: 'Bancada de separação',
    defaultWidth: 150,
    defaultLength: 70,
    resizable: true,
    render: SortingBench,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS, EQUIPMENT_CODE_FIELD],
  },
  'packing-table': {
    key: 'packing-table',
    category: 'equipment',
    label: 'Mesa de packing',
    defaultWidth: 150,
    defaultLength: 80,
    resizable: true,
    render: PackingTable,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS, EQUIPMENT_CODE_FIELD],
  },
  scale: {
    key: 'scale',
    category: 'equipment',
    label: 'Balança',
    defaultWidth: 100,
    defaultLength: 100,
    resizable: true,
    render: Scale,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS, EQUIPMENT_CODE_FIELD],
  },
  'label-printer': {
    key: 'label-printer',
    category: 'equipment',
    label: 'Impressora/estação de etiquetas',
    defaultWidth: 45,
    defaultLength: 35,
    resizable: false,
    render: LabelPrinter,
    propertyFields: [...BASE_FIELDS, EQUIPMENT_CODE_FIELD],
  },
  'rf-scanner': {
    key: 'rf-scanner',
    category: 'equipment',
    label: 'Scanner/RF',
    defaultWidth: 35,
    defaultLength: 15,
    resizable: false,
    render: RfScanner,
    propertyFields: [...BASE_FIELDS, EQUIPMENT_CODE_FIELD],
  },
  'area-inspection': {
    key: 'area-inspection',
    category: 'area',
    label: 'Área de conferência',
    defaultWidth: 300,
    defaultLength: 300,
    resizable: true,
    render: AreaInspection,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      {
        key: 'size',
        label: 'Área',
        kind: 'info',
        compute: (obj) => `${((obj.width / 100) * (obj.length / 100)).toFixed(1)} m²`,
      },
    ],
  },
  'area-shipping': {
    key: 'area-shipping',
    category: 'area',
    label: 'Área de expedição',
    defaultWidth: 300,
    defaultLength: 300,
    resizable: true,
    render: AreaShipping,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      {
        key: 'size',
        label: 'Área',
        kind: 'info',
        compute: (obj) => `${((obj.width / 100) * (obj.length / 100)).toFixed(1)} m²`,
      },
    ],
  },
  'area-receiving': {
    key: 'area-receiving',
    category: 'area',
    label: 'Área de recebimento',
    defaultWidth: 300,
    defaultLength: 300,
    resizable: true,
    render: AreaReceiving,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      {
        key: 'size',
        label: 'Área',
        kind: 'info',
        compute: (obj) => `${((obj.width / 100) * (obj.length / 100)).toFixed(1)} m²`,
      },
    ],
  },

  // --- Fluxo (Fase 3) ---
  'directional-arrow': {
    key: 'directional-arrow',
    category: 'flow',
    label: 'Seta direcional',
    defaultWidth: 80,
    defaultLength: 40,
    resizable: false,
    render: DirectionalArrow,
    propertyFields: [...BASE_FIELDS],
  },
  'traffic-lane': {
    key: 'traffic-lane',
    category: 'flow',
    label: 'Faixa de circulação',
    defaultWidth: 300,
    defaultLength: 100,
    resizable: true,
    render: TrafficLane,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  intersection: {
    key: 'intersection',
    category: 'flow',
    label: 'Cruzamento',
    defaultWidth: 150,
    defaultLength: 150,
    resizable: true,
    render: Intersection,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  'safety-zone': {
    key: 'safety-zone',
    category: 'flow',
    label: 'Zona de segurança',
    defaultWidth: 150,
    defaultLength: 150,
    resizable: true,
    render: SafetyZone,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  'pedestrian-lane': {
    key: 'pedestrian-lane',
    category: 'flow',
    label: 'Faixa de pedestres',
    defaultWidth: 200,
    defaultLength: 80,
    resizable: true,
    render: PedestrianLane,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },

  // --- Equipamentos (Fase 3) ---
  'platform-cart': {
    key: 'platform-cart',
    category: 'equipment',
    label: 'Carrinho de carga/plataforma',
    defaultWidth: 80,
    defaultLength: 120,
    resizable: false,
    render: PlatformCart,
    propertyFields: [...BASE_FIELDS, EQUIPMENT_CODE_FIELD, ...EQUIPMENT_SPEC_FIELDS],
  },

  // --- Estrutura (Fase 8) ---
  column: {
    key: 'column',
    category: 'structure',
    label: 'Coluna/Pilar',
    defaultWidth: 40,
    defaultLength: 40,
    resizable: true,
    render: Column,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  gate: {
    key: 'gate',
    category: 'structure',
    label: 'Portão',
    defaultWidth: 300,
    defaultLength: 20,
    resizable: true,
    render: Gate,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  stairs: {
    key: 'stairs',
    category: 'structure',
    label: 'Escada',
    defaultWidth: 120,
    defaultLength: 300,
    resizable: true,
    render: Stairs,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },

  // --- Armazenagem (Fase 8) ---
  'drive-in': {
    key: 'drive-in',
    category: 'storage',
    label: 'Drive-in',
    defaultWidth: 300,
    defaultLength: 150,
    resizable: true,
    render: DriveIn,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      { key: 'levels', label: 'Níveis', kind: 'select', options: LEVEL_OPTIONS },
    ],
    defaultProperties: { levels: 3 },
  },
  'push-back': {
    key: 'push-back',
    category: 'storage',
    label: 'Push-back',
    defaultWidth: 300,
    defaultLength: 150,
    resizable: true,
    render: PushBack,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      { key: 'levels', label: 'Níveis', kind: 'select', options: LEVEL_OPTIONS },
    ],
    defaultProperties: { levels: 3 },
  },
  'flow-rack': {
    key: 'flow-rack',
    category: 'storage',
    label: 'Flow rack',
    defaultWidth: 300,
    defaultLength: 150,
    resizable: true,
    render: FlowRack,
    propertyFields: [
      ...BASE_FIELDS,
      ...DIMENSION_FIELDS,
      ADDRESS_FIELD,
      { key: 'levels', label: 'Níveis', kind: 'select', options: LEVEL_OPTIONS },
    ],
    defaultProperties: { levels: 3 },
  },
  cantilever: {
    key: 'cantilever',
    category: 'storage',
    label: 'Cantilever',
    defaultWidth: 400,
    defaultLength: 100,
    resizable: true,
    render: Cantilever,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS, ADDRESS_FIELD],
  },

  // --- Equipamentos (Fase 8) ---
  'reach-truck': {
    key: 'reach-truck',
    category: 'equipment',
    label: 'Reach truck',
    defaultWidth: 115,
    defaultLength: 250,
    resizable: false,
    render: ReachTruck,
    propertyFields: [...BASE_FIELDS, EQUIPMENT_CODE_FIELD, ...EQUIPMENT_SPEC_FIELDS],
  },
  tug: {
    key: 'tug',
    category: 'equipment',
    label: 'Rebocador',
    defaultWidth: 70,
    defaultLength: 130,
    resizable: false,
    render: Tug,
    propertyFields: [...BASE_FIELDS, EQUIPMENT_CODE_FIELD, ...EQUIPMENT_SPEC_FIELDS],
  },
  'order-picker': {
    key: 'order-picker',
    category: 'equipment',
    label: 'Order picker',
    defaultWidth: 90,
    defaultLength: 200,
    resizable: false,
    render: OrderPicker,
    propertyFields: [...BASE_FIELDS, EQUIPMENT_CODE_FIELD, ...EQUIPMENT_SPEC_FIELDS],
  },

  // --- Unitização (Fase 8) ---
  box: {
    key: 'box',
    category: 'pallet',
    label: 'Caixa',
    defaultWidth: 40,
    defaultLength: 30,
    resizable: true,
    render: Box,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  container: {
    key: 'container',
    category: 'pallet',
    label: 'Container',
    defaultWidth: 240,
    defaultLength: 600,
    resizable: true,
    render: Container,
    propertyFields: [...BASE_FIELDS, ...DIMENSION_FIELDS],
  },
  'cage-pallet': {
    key: 'cage-pallet',
    category: 'pallet',
    label: 'Gaiola',
    defaultWidth: 120,
    defaultLength: 100,
    resizable: false,
    render: CagePallet,
    propertyFields: [...BASE_FIELDS],
  },
}

export const OBJECT_CATEGORIES_ORDER = ['structure', 'storage', 'pallet', 'equipment', 'area', 'flow'] as const

export const CATEGORY_LABELS: Record<string, string> = {
  structure: 'Estrutura',
  storage: 'Armazenagem',
  pallet: 'Unitização',
  equipment: 'Equipamentos',
  area: 'Áreas',
  flow: 'Fluxos',
  other: 'Outros',
}

export function getObjectTypesByCategory(category: string): ObjectTypeDefinition[] {
  return Object.values(OBJECT_CATALOG).filter((def) => def.category === category)
}

/**
 * Subtítulo de uma linha da biblioteca — a função logística do objeto, não sua categoria: é o
 * que diferencia "Empilhadeira · Movimentação de cargas" de "Esteira · Transporte contínuo" numa
 * lista densa. Fica fora das definições do catálogo (que descrevem geometria e propriedades) e
 * cai no rótulo da categoria para qualquer tipo ainda sem descrição própria.
 */
const OBJECT_DESCRIPTIONS: Partial<Record<ObjectTypeKey, string>> = {
  wall: 'Fechamento e divisão',
  door: 'Acesso e circulação',
  dock: 'Carga e descarga',
  column: 'Elemento estrutural',
  gate: 'Portão de acesso',
  stairs: 'Circulação vertical',
  rack: 'Armazenagem paletizada',
  shelf: 'Armazenagem leve',
  'storage-block': 'Armazenagem em bloco',
  corridor: 'Circulação interna',
  'drive-in': 'Alta densidade',
  'push-back': 'Alta densidade dinâmica',
  'flow-rack': 'Abastecimento por gravidade',
  cantilever: 'Cargas longas',
  'area-picking': 'Separação de pedidos',
  'area-staging': 'Consolidação de cargas',
  pallet: 'Unitização de carga',
  box: 'Unitização em caixa',
  container: 'Contêiner de transporte',
  'cage-pallet': 'Contentor gradeado',
  forklift: 'Movimentação de cargas',
  'pallet-jack': 'Movimentação de cargas',
  'reach-truck': 'Movimentação em corredor estreito',
  tug: 'Rebocador de comboios',
  'order-picker': 'Separação em altura',
  'platform-cart': 'Transporte manual',
  conveyor: 'Transporte contínuo',
  'sorting-bench': 'Área de trabalho',
  'packing-table': 'Embalagem e expedição',
  scale: 'Pesagem e conferência',
  'label-printer': 'Etiquetagem',
  'rf-scanner': 'Coleta de dados',
  area: 'Área funcional genérica',
  'area-inspection': 'Conferência de cargas',
  'area-shipping': 'Expedição',
  'area-receiving': 'Recebimento',
  'flow-route': 'Rota de circulação',
  'directional-arrow': 'Sentido de fluxo',
  'traffic-lane': 'Faixa de tráfego',
  intersection: 'Cruzamento de rotas',
  'safety-zone': 'Zona de segurança',
  'pedestrian-lane': 'Faixa de pedestres',
}

export function getObjectDescription(key: ObjectTypeKey): string {
  return OBJECT_DESCRIPTIONS[key] ?? CATEGORY_LABELS[OBJECT_CATALOG[key].category] ?? ''
}
