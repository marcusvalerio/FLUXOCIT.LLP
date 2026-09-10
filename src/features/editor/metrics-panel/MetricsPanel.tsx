import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEditorStore } from '../state/useEditorStore'
import { computeProjectMetrics } from '../../../shared/lib/metrics'
import { computeOccupancyPercent, computeSpatialViolations } from '../../../shared/lib/spatialRules'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="min-w-0 truncate text-text-secondary">{label}</span>
      <span className="shrink-0 font-medium tabular-nums text-text-primary">{value}</span>
    </div>
  )
}

/** Indicador de destaque: número grande em Supreme, rótulo curto — leitura de relance. */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-alt/40 px-3 py-2.5">
      <p className="font-heading text-[11px] font-semibold uppercase tracking-wide text-text-disabled">{label}</p>
      <p className="mt-1 font-heading text-lg font-semibold leading-none tabular-nums text-text-primary">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-tight text-text-secondary">{hint}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="mb-2 font-heading text-[11px] font-semibold uppercase tracking-wide text-text-disabled">
      {children}
    </p>
  )
}

/** Aggregate project indicators (Layout + Fluxo) — see docs/BUSINESS_RULES.md § Métricas. */
export function MetricsPanel() {
  const objects = useEditorStore((s) => s.objects)
  const flowNodes = useEditorStore((s) => s.flowNodes)
  const flowConnections = useEditorStore((s) => s.flowConnections)
  const envWidthM = useEditorStore((s) => s.envWidthM)
  const envHeightM = useEditorStore((s) => s.envHeightM)

  const m = computeProjectMetrics(objects, flowNodes, envWidthM, envHeightM, flowConnections)
  const occupancy = computeOccupancyPercent(objects, envWidthM * 100, envHeightM * 100)
  const violations = computeSpatialViolations(objects, envWidthM * 100, envHeightM * 100)
  const criticalCount = violations.filter((v) => v.severity === 'critical').length
  const warningCount = violations.length - criticalCount

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Área total" value={`${m.areaTotalM2.toFixed(1)} m²`} />
        <Stat
          label="Ocupação"
          value={`${Math.min(999, occupancy).toFixed(0)}%`}
          hint="Aprox., por soma de áreas"
        />
      </div>

      <div>
        <SectionTitle>Áreas</SectionTitle>
        <div className="space-y-2">
          <Row label="Armazenagem" value={`${m.areaArmazenagemM2.toFixed(1)} m²`} />
          <Row label="Operacional" value={`${m.areaOperacionalM2.toFixed(1)} m²`} />
          <Row label="Circulação" value={`${m.areaCirculacaoM2.toFixed(1)} m²`} />
        </div>
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <SectionTitle>Contagens</SectionTitle>
        <Row label="Posições de pallet (racks)" value={String(m.posicoesPallet)} />
        <Row label="Equipamentos" value={String(m.qtdEquipamentos)} />
        <Row label="Docas" value={String(m.qtdDocas)} />
        <Row label="Comprimento de corredores" value={`${m.comprimentoCorredoresM.toFixed(1)} m`} />
        <Row label="Áreas" value={String(m.qtdAreas)} />
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <SectionTitle>Operação</SectionTitle>
        <Row label="Etapas de fluxo" value={String(m.qtdEtapasFluxo)} />
        <Row label="Conexões" value={String(m.qtdConexoesFluxo)} />
        <Row label="Etapas isoladas" value={String(m.qtdEtapasIsoladas)} />
        {/* Derivadas que só existem com dado suficiente — ausência é informação, não zero. */}
        <Row
          label="Distância do fluxo"
          value={m.distanciaFluxoM === undefined ? '—' : `${m.distanciaFluxoM.toFixed(1)} m`}
        />
        <Row
          label="Capacidade do gargalo"
          value={m.capacidadeGargalo ? `${m.capacidadeGargalo.valor} ${m.capacidadeGargalo.unidade}` : '—'}
        />
        {(m.distanciaFluxoM === undefined || !m.capacidadeGargalo) && (
          <p className="text-[11px] leading-tight text-text-disabled">
            "—" indica dado insuficiente: a distância exige etapas conectadas e vinculadas a áreas;
            o gargalo exige ao menos duas etapas com capacidade na mesma unidade de vazão.
          </p>
        )}
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-[11px] font-semibold uppercase tracking-wide text-text-disabled">
            Alertas
          </h3>
          {violations.length > 0 && (
            <span className="text-xs text-text-secondary">
              {criticalCount > 0 && `${criticalCount} conflito${criticalCount > 1 ? 's' : ''}`}
              {criticalCount > 0 && warningCount > 0 && ' · '}
              {warningCount > 0 && `${warningCount} atenção`}
            </span>
          )}
        </div>
        {violations.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-success/10 text-success text-sm p-2.5">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Nenhum conflito detectado no layout.</span>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {violations.map((v) => (
              <li
                key={v.id}
                className={`flex items-start gap-2 rounded-md text-sm p-2 ${
                  v.severity === 'critical' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                }`}
              >
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{v.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-text-disabled">
        Estimativas por soma de área/contagem de objetos; sobreposições (ex.: pallet sobre
        porta-paletes) podem ser contadas mais de uma vez.
      </p>
    </div>
  )
}
