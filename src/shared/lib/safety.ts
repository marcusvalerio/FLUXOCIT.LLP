import type { LayoutObject, ObjectTypeKey } from '../../types/layout'
import { findBlockedCorridors, getRecommendedCorridorWidthCm } from './spatialRules'
import { MOBILE_EQUIPMENT_TYPES } from './logisticsTypes'

/**
 * Verificações de segurança do layout — o que o selo "SEGURANÇA" do editor mostra.
 *
 * São checagens de referência, derivadas das normas brasileiras que têm reflexo direto na planta
 * (NR-11, NR-12, NR-23 + instruções técnicas do Corpo de Bombeiros, NR-26, ABNT NBR 15524). Não
 * substituem o projeto de prevenção e combate a incêndio nem a avaliação do responsável técnico:
 * as exigências variam por estado, risco da ocupação e atividade.
 */

export type SafetyStatus = 'ok' | 'attention' | 'pending'

export interface SafetyCheck {
  id: string
  title: string
  /** Norma ou instrução de referência. */
  reference: string
  status: SafetyStatus
  detail: string
}

export interface SafetyGuideline {
  reference: string
  title: string
  appliesTo: string
}

export const SAFETY_GUIDELINES: readonly SafetyGuideline[] = [
  {
    reference: 'NR-11',
    title: 'Transporte, movimentação, armazenagem e manuseio de materiais',
    appliesTo: 'Corredores e zonas de manobra das empilhadeiras; equipamentos estacionados fora das vias.',
  },
  {
    reference: 'NR-12 (item 12.2)',
    title: 'Arranjo físico e instalações',
    appliesTo: 'Vias principais de circulação com no mínimo 1,20 m, demarcadas e mantidas livres.',
  },
  {
    reference: 'NR-23 + IT do Corpo de Bombeiros',
    title: 'Proteção contra incêndios',
    appliesTo: 'Extintores, hidrantes, saídas e rotas de fuga sinalizadas, iluminação de emergência.',
  },
  {
    reference: 'NR-26 / ABNT NBR 7195',
    title: 'Sinalização e cores de segurança',
    appliesTo: 'Demarcação de circulação e de zonas de risco; cores dos equipamentos de segurança.',
  },
  {
    reference: 'ABNT NBR 15524',
    title: 'Sistemas de armazenagem (porta-paletes)',
    appliesTo: 'Proteção de colunas, corredores compatíveis com a máquina e placas de carga.',
  },
  {
    reference: 'NR-10 / NR-11 + fabricante',
    title: 'Recarga de baterias de tração',
    appliesTo: 'Área própria e ventilada para recarga, com lava-olhos/chuveiro de emergência próximo.',
  },
]

/** Distância de referência até um extintor: 20 m de caminhamento (IT 21 do Corpo de Bombeiros
 * de SP, risco médio). A checagem usa distância em linha reta — mais otimista que o caminhamento
 * real —, então um resultado "ok" ainda pede conferência no projeto de prevenção. */
export const EXTINGUISHER_MAX_DISTANCE_M = 20

const center = (o: LayoutObject) => ({ x: (o.x + o.width / 2) / 100, y: (o.y + o.length / 2) / 100 })
const ofType = (objects: LayoutObject[], ...types: ObjectTypeKey[]) => objects.filter((o) => types.includes(o.objectType))
const fmt = (m: number) => m.toFixed(m < 10 ? 2 : 1).replace('.', ',')

/** Maior distância (em linha reta, m) entre um ponto do ambiente e o extintor mais próximo. */
export function maxDistanceToExtinguisher(objects: LayoutObject[], envWidthM: number, envHeightM: number): number | null {
  const ext = ofType(objects, 'fire-extinguisher').map(center)
  if (!ext.length) return null
  let worst = 0
  const step = 0.5
  for (let x = step / 2; x < envWidthM; x += step) {
    for (let y = step / 2; y < envHeightM; y += step) {
      let best = Infinity
      for (const e of ext) best = Math.min(best, Math.hypot(e.x - x, e.y - y))
      worst = Math.max(worst, best)
    }
  }
  return worst
}

function near(a: LayoutObject, b: LayoutObject, marginCm: number): boolean {
  return a.x - marginCm < b.x + b.width && b.x < a.x + a.width + marginCm && a.y - marginCm < b.y + b.length && b.y < a.y + a.length + marginCm
}

export function computeSafetyChecks(objects: LayoutObject[], envWidthM: number, envHeightM: number): SafetyCheck[] {
  const checks: SafetyCheck[] = []
  const hasLayout = objects.length > 0

  // 1. Vias de pedestres ≥ 1,20 m
  const pedestrianRoutes = [
    ...ofType(objects, 'pedestrian-lane'),
    ...ofType(objects, 'corridor').filter((o) => o.properties.corridorType === 'pedestrian'),
  ]
  const minPed = getRecommendedCorridorWidthCm('pedestrian')
  const narrowPed = pedestrianRoutes.filter((o) => Math.min(o.width, o.length) < minPed)
  checks.push({
    id: 'pedestrian-routes',
    title: 'Vias de pedestres com pelo menos 1,20 m',
    reference: 'NR-12, item 12.2.1',
    status: !pedestrianRoutes.length ? 'pending' : narrowPed.length ? 'attention' : 'ok',
    detail: !pedestrianRoutes.length
      ? 'Nenhuma via de pedestres demarcada. Desenhe a rota das pessoas separada do tráfego de máquinas.'
      : narrowPed.length
        ? `${narrowPed.length} via(s) abaixo de 1,20 m (menor: ${fmt(Math.min(...narrowPed.map((o) => Math.min(o.width, o.length))) / 100)} m).`
        : `${pedestrianRoutes.length} via(s) demarcada(s), todas com 1,20 m ou mais.`,
  })

  // 2. Corredores de empilhadeira compatíveis com a máquina
  const forkliftAisles = ofType(objects, 'corridor').filter((o) => o.properties.corridorType === 'forklift')
  const minFork = getRecommendedCorridorWidthCm('forklift')
  const narrowFork = forkliftAisles.filter((o) => Math.min(o.width, o.length) < minFork)
  const hasMachines = objects.some((o) => MOBILE_EQUIPMENT_TYPES.has(o.objectType))
  checks.push({
    id: 'forklift-aisles',
    title: 'Corredores de empilhadeira dimensionados',
    reference: 'NR-11 · NBR 15524',
    status: !forkliftAisles.length ? (hasMachines ? 'attention' : 'pending') : narrowFork.length ? 'attention' : 'ok',
    detail: !forkliftAisles.length
      ? hasMachines
        ? 'Há equipamentos móveis, mas nenhum corredor do tipo "Empilhadeira" definido.'
        : 'Nenhum corredor de empilhadeira definido.'
      : narrowFork.length
        ? `${narrowFork.length} corredor(es) abaixo de ${fmt(minFork / 100)} m — confira o corredor mínimo da máquina no manual do fabricante.`
        : `${forkliftAisles.length} corredor(es) com ${fmt(minFork / 100)} m ou mais.`,
  })

  // 3. Corredores livres
  const blocked = findBlockedCorridors(objects)
  checks.push({
    id: 'corridors-clear',
    title: 'Corredores e rotas livres de obstáculos',
    reference: 'NR-12 · NR-23',
    status: !hasLayout ? 'pending' : blocked.length ? 'attention' : 'ok',
    detail: blocked.length ? `${blocked.length} obstrução(ões): ${blocked[0]!.message}` : 'Nenhum objeto invadindo corredores.',
  })

  // 4. Extintores e cobertura
  const extinguishers = ofType(objects, 'fire-extinguisher')
  const worst = maxDistanceToExtinguisher(objects, envWidthM, envHeightM)
  checks.push({
    id: 'extinguishers',
    title: `Extintores a até ${EXTINGUISHER_MAX_DISTANCE_M} m de qualquer ponto`,
    reference: 'NR-23 · IT 21 (CB-SP, risco médio)',
    status: !hasLayout ? 'pending' : !extinguishers.length || (worst ?? Infinity) > EXTINGUISHER_MAX_DISTANCE_M ? 'attention' : 'ok',
    detail: !extinguishers.length
      ? 'Nenhum extintor no layout.'
      : `${extinguishers.length} extintor(es); ponto mais distante a ${fmt(worst!)} m em linha reta (o caminhamento real é maior).`,
  })

  // 5. Saídas de emergência sinalizadas
  const exits = ofType(objects, 'emergency-exit')
  checks.push({
    id: 'emergency-exits',
    title: 'Saídas e rotas de fuga sinalizadas',
    reference: 'NR-23 · NR-26 · IT de saídas de emergência',
    status: !hasLayout ? 'pending' : exits.length ? 'ok' : 'attention',
    detail: exits.length ? `${exits.length} placa(s) de saída de emergência.` : 'Nenhuma placa de saída de emergência no layout.',
  })

  // 6. Iluminação de emergência
  const lights = ofType(objects, 'emergency-light')
  checks.push({
    id: 'emergency-lighting',
    title: 'Iluminação de emergência',
    reference: 'NR-23 · IT de iluminação de emergência',
    status: !hasLayout ? 'pending' : lights.length ? 'ok' : 'attention',
    detail: lights.length ? `${lights.length} luminária(s) de emergência.` : 'Nenhuma luminária de emergência no layout.',
  })

  // 7. Zona de manobra em cada doca
  const docks = ofType(objects, 'dock')
  const zones = ofType(objects, 'safety-zone')
  const docksWithout = docks.filter((d) => !zones.some((z) => near(d, z, 300)))
  checks.push({
    id: 'dock-zones',
    title: 'Zona de manobra sinalizada nas docas',
    reference: 'NR-11 · NR-26',
    status: !docks.length ? 'pending' : docksWithout.length ? 'attention' : 'ok',
    detail: !docks.length
      ? 'Sem docas no layout.'
      : docksWithout.length
        ? `${docksWithout.length} doca(s) sem zona de segurança a até 3 m.`
        : `Todas as ${docks.length} doca(s) com zona de manobra.`,
  })

  // 8. Lava-olhos onde há recarga de baterias
  const eyewash = ofType(objects, 'eyewash')
  checks.push({
    id: 'eyewash',
    title: 'Lava-olhos/chuveiro junto à recarga de baterias',
    reference: 'NR-10 · NR-11 · fabricante',
    status: !hasMachines ? 'pending' : eyewash.length ? 'ok' : 'attention',
    detail: !hasMachines
      ? 'Sem equipamentos móveis a bateria no layout.'
      : eyewash.length
        ? `${eyewash.length} lava-olhos/chuveiro de emergência.`
        : 'Há equipamentos móveis, mas nenhum lava-olhos/chuveiro de emergência.',
  })

  return checks
}

/** Situação geral: "attention" se alguma checagem pede atenção; "ok" se ao menos uma passou e
 * nenhuma pede atenção; "pending" para um layout ainda sem nada a verificar. */
export function overallSafetyStatus(checks: SafetyCheck[]): SafetyStatus {
  if (checks.some((c) => c.status === 'attention')) return 'attention'
  if (checks.some((c) => c.status === 'ok')) return 'ok'
  return 'pending'
}
