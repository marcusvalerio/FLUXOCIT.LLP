import { computeOccupancyPercent, computeSpatialViolations } from '../spatialRules'
import type { AnalysisContext, Insight, InsightSeverity } from './types'

/**
 * Regras espaciais (Layout). A detecção pesada — sobreposição, corredor bloqueado ou estreito,
 * conflito equipamento × estrutura, doca bloqueada, objeto fora do ambiente — já existia em
 * `shared/lib/spatialRules` e continua sendo a fonte: aqui elas só ganham a forma de insight
 * (regra que originou + recomendação), para conviverem com as regras de Flow num painel só.
 */

/** Recomendação por tipo de violação espacial — o "e agora?" que faltava no alerta cru. */
const RECOMMENDATIONS: Record<string, string> = {
  'out-of-bounds': 'Traga o objeto para dentro dos limites do ambiente ou ajuste as dimensões do ambiente.',
  'storage-overlap': 'Afaste as estruturas: duas ocupando o mesmo espaço não existem no galpão real.',
  'blocked-corridor': 'Libere o corredor — ele precisa estar livre para a circulação prevista.',
  'narrow-corridor': 'Alargue o corredor até a largura recomendada para o tipo de tráfego que ele recebe.',
  'equipment-structure': 'Reposicione o equipamento: ele está ocupando o mesmo espaço de uma estrutura fixa.',
  'area-overlap': 'Separe as áreas operacionais para que cada região tenha uma função clara.',
  'blocked-dock': 'Desobstrua a doca: carga e descarga exigem acesso livre.',
}

function recommendationFor(violationId: string): string {
  const prefix = Object.keys(RECOMMENDATIONS).find((key) => violationId.startsWith(key))
  return prefix
    ? RECOMMENDATIONS[prefix]!
    : 'Revise o posicionamento dos objetos envolvidos.'
}

export function findSpatialInsights(context: AnalysisContext): Insight[] {
  const violations = computeSpatialViolations(
    context.objects,
    context.envWidthM * 100,
    context.envHeightM * 100,
  )

  return violations.map((violation) => ({
    id: `layout/${violation.id}`,
    ruleId: `layout/${violation.id.split(':')[0]}`,
    domain: 'layout' as const,
    severity: violation.severity as InsightSeverity,
    title: violation.message,
    description: 'Detectado pelas regras espaciais do projeto, com base na posição e nas dimensões reais dos objetos.',
    recommendation: recommendationFor(violation.id),
    targets: { objectIds: violation.objectIds },
  }))
}

/** Ocupação: alta demais compromete a circulação; baixa demais indica espaço ocioso. */
const HIGH_OCCUPANCY_PERCENT = 85
const LOW_OCCUPANCY_PERCENT = 15

export function findOccupancyInsights(context: AnalysisContext): Insight[] {
  if (context.objects.length === 0) return []
  const occupancy = computeOccupancyPercent(
    context.objects,
    context.envWidthM * 100,
    context.envHeightM * 100,
  )

  if (occupancy >= HIGH_OCCUPANCY_PERCENT) {
    return [
      {
        id: 'layout/occupancy-high',
        ruleId: 'layout/occupancy-high',
        domain: 'layout',
        severity: 'warning',
        title: `Ocupação elevada (${Math.round(occupancy)}%)`,
        description:
          'O ambiente está quase todo ocupado por estruturas, equipamentos e cargas — sobra pouco espaço para circulação e operação.',
        recommendation: 'Revise a densidade de armazenagem ou considere ampliar o ambiente.',
        targets: {},
      },
    ]
  }

  if (occupancy > 0 && occupancy <= LOW_OCCUPANCY_PERCENT) {
    return [
      {
        id: 'layout/occupancy-low',
        ruleId: 'layout/occupancy-low',
        domain: 'layout',
        severity: 'info',
        title: `Área subutilizada (${Math.round(occupancy)}% de ocupação)`,
        description: 'Boa parte do ambiente está livre. Pode ser proposital (expansão prevista) ou espaço ocioso.',
        recommendation: 'Avalie se cabe mais armazenagem ou se o ambiente pode ser reduzido no projeto.',
        targets: {},
      },
    ]
  }

  return []
}
