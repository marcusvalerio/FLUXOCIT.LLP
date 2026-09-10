import { CheckCircle2, Info, OctagonAlert, TriangleAlert } from 'lucide-react'
import { summarizeInsights, type Insight, type InsightSeverity } from '../../../shared/lib/intelligence'
import { useEditorStore } from '../state/useEditorStore'
import { useProjectInsights } from './useProjectInsights'

const SEVERITY_STYLE: Record<InsightSeverity, { icon: typeof Info; className: string; label: string }> = {
  critical: { icon: OctagonAlert, className: 'text-danger', label: 'Crítico' },
  warning: { icon: TriangleAlert, className: 'text-warning', label: 'Atenção' },
  info: { icon: Info, className: 'text-primary', label: 'Informação' },
}

const DOMAIN_LABEL: Record<Insight['domain'], string> = {
  layout: 'Layout',
  flow: 'Fluxo',
  integration: 'Layout + Fluxo',
}

/** Um insight: o que é, por que apareceu e o que fazer — nessa ordem. */
function InsightCard({ insight, onSelect }: { insight: Insight; onSelect: (insight: Insight) => void }) {
  const style = SEVERITY_STYLE[insight.severity]
  const Icon = style.icon
  const selectable = (insight.targets.objectIds?.length ?? 0) > 0

  return (
    <li className="rounded-xl border border-border bg-surface p-3 transition-colors duration-150 hover:border-border-strong">
      <div className="flex items-start gap-2.5">
        <Icon size={16} className={`mt-0.5 shrink-0 ${style.className}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-tight text-text-primary">{insight.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{insight.description}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-text-primary">
            <span className="font-medium">O que fazer: </span>
            {insight.recommendation}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded bg-surface-alt px-1.5 py-0.5 font-heading text-[10px] font-medium uppercase tracking-wide text-text-disabled">
              {DOMAIN_LABEL[insight.domain]}
            </span>
            {/* A regra que originou o alerta fica à vista: análise que não se explica não ajuda
                ninguém a confiar nela. */}
            <code className="text-[10px] text-text-disabled">{insight.ruleId}</code>
            {selectable && (
              <button
                type="button"
                onClick={() => onSelect(insight)}
                className="ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary transition-colors duration-150 hover:bg-primary/10"
              >
                Ver na prancheta
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

/**
 * Painel de Análise: o que a Intelligence encontrou no projeto, em ordem de severidade.
 *
 * A camada de análise é pura e vive em `shared/lib/intelligence`; este componente só apresenta.
 * O cálculo é adiado enquanto o usuário edita (ver useProjectInsights) para nunca disputar
 * quadro com o canvas.
 */
export function IntelligencePanel({ active }: { active: boolean }) {
  const insights = useProjectInsights(active)
  const summary = summarizeInsights(insights)
  const selectMany = useEditorStore((s) => s.selectMany)
  const selectFlowNode = useEditorStore((s) => s.selectFlowNode)

  function handleSelect(insight: Insight) {
    const objectIds = insight.targets.objectIds ?? []
    if (objectIds.length > 0) selectMany(objectIds, false)
    const flowNodeId = insight.targets.flowNodeIds?.[0]
    if (flowNodeId) selectFlowNode(flowNodeId)
  }

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center px-2 py-10 text-center animate-fade-in">
        <CheckCircle2 size={26} className="mb-3 text-success" strokeWidth={1.5} />
        <p className="font-heading text-sm font-semibold text-text-primary">Nada a apontar</p>
        <p className="mt-1.5 max-w-[15rem] text-xs leading-relaxed text-text-secondary">
          As regras de layout, fluxo e integração não encontraram conflitos nem lacunas neste projeto.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {summary.critical > 0 && (
          <span className="rounded-md bg-danger/10 px-2 py-1 text-[11px] font-medium text-danger">
            {summary.critical} crítico{summary.critical > 1 ? 's' : ''}
          </span>
        )}
        {summary.warning > 0 && (
          <span className="rounded-md bg-warning/10 px-2 py-1 text-[11px] font-medium text-warning">
            {summary.warning} atenção
          </span>
        )}
        {summary.info > 0 && (
          <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
            {summary.info} informaç{summary.info > 1 ? 'ões' : 'ão'}
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} onSelect={handleSelect} />
        ))}
      </ul>
    </div>
  )
}
