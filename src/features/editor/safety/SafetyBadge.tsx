import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, CircleDashed, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { useEditorStore } from '../state/useEditorStore'
import { SAFETY_GUIDELINES, computeSafetyChecks, overallSafetyStatus, type SafetyStatus } from '../../../shared/lib/safety'

const PILL_CLASS: Record<SafetyStatus, string> = {
  ok: 'border-success/40 bg-success/10 text-success',
  attention: 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-400',
  pending: 'border-border bg-surface-alt text-text-secondary',
}
const PILL_ICON = { ok: ShieldCheck, attention: ShieldAlert, pending: ShieldQuestion }
const ROW_ICON = {
  ok: <CircleCheck size={16} className="mt-0.5 shrink-0 text-success" />,
  attention: <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />,
  pending: <CircleDashed size={16} className="mt-0.5 shrink-0 text-text-disabled" />,
}

/**
 * Selo "SEGURANÇA" do editor: sempre visível no cabeçalho, lembra que o layout segue diretrizes
 * de segurança e abre a lista do que está sendo conferido (shared/lib/safety) e de quais normas
 * foram consideradas. A cor resume a situação: verde (ok), âmbar (há pontos de atenção) ou neutra.
 * No celular o cabeçalho não comporta o selo: o editor o mostra flutuando sobre a prancheta.
 */
export function SafetyBadge({ className = 'relative' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const objects = useEditorStore((s) => s.objects)
  const envWidthM = useEditorStore((s) => s.envWidthM)
  const envHeightM = useEditorStore((s) => s.envHeightM)
  const checks = useMemo(() => computeSafetyChecks(objects, envWidthM, envHeightM), [objects, envWidthM, envHeightM])
  const status = overallSafetyStatus(checks)
  const attention = checks.filter((c) => c.status === 'attention').length
  const Icon = PILL_ICON[status]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-safety-badge]')) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className={`shrink-0 ${className}`} data-safety-badge>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Diretrizes de segurança do layout"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors duration-150 hover:brightness-95 ${PILL_CLASS[status]}`}
      >
        <Icon size={14} />
        Segurança
        {attention > 0 && (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] text-white">{attention}</span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Diretrizes de segurança"
          className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-lg animate-panel-in sm:absolute sm:inset-x-auto sm:left-1/2 sm:top-full sm:mt-2 sm:w-[420px] sm:-translate-x-1/2"
        >
          <div className="max-h-[70vh] overflow-y-auto p-4 scrollbar-slim">
            <h2 className="font-heading text-sm font-semibold text-text-primary">Segurança do layout</h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              {status === 'attention'
                ? `${attention} ponto(s) pedem atenção.`
                : status === 'ok'
                  ? 'Nenhum ponto de atenção nas verificações automáticas.'
                  : 'Adicione objetos ao layout para iniciar as verificações.'}
            </p>

            <ul className="mt-3 flex flex-col gap-2.5">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-2">
                  {ROW_ICON[c.status]}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-tight text-text-primary">{c.title}</p>
                    <p className="text-xs text-text-secondary">{c.detail}</p>
                    <p className="text-[11px] text-text-disabled">{c.reference}</p>
                  </div>
                </li>
              ))}
            </ul>

            <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Diretrizes consideradas</h3>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {SAFETY_GUIDELINES.map((g) => (
                <li key={g.reference} className="text-xs">
                  <span className="font-semibold text-text-primary">{g.reference}</span>
                  <span className="text-text-secondary"> — {g.title}. {g.appliesTo}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 rounded-lg bg-surface-alt p-2.5 text-[11px] leading-snug text-text-secondary">
              Verificações automáticas de referência. Não substituem o projeto de prevenção e combate a incêndio
              aprovado no Corpo de Bombeiros nem a avaliação do responsável técnico de segurança — as exigências
              variam por estado, ocupação e risco.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
