import { MousePointerClick, SquareDashed } from 'lucide-react'

/**
 * Estado vazio do painel de propriedades: explica o que fazer para preenchê-lo, em vez de
 * deixar uma coluna em branco ao lado da prancheta. Discreto de propósito — o foco continua
 * sendo o canvas.
 */
export function PropertiesEmptyState() {
  return (
    <div className="flex flex-col items-center px-2 py-10 text-center animate-fade-in">
      <span className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-border-strong/70 bg-surface-alt/50">
        <SquareDashed size={26} className="text-text-disabled" strokeWidth={1.5} />
        <MousePointerClick
          size={16}
          className="absolute -bottom-1 -right-1 rounded-md bg-surface p-0.5 text-primary shadow-sm"
        />
      </span>
      <p className="font-heading text-sm font-semibold text-text-primary">Nenhum elemento selecionado</p>
      <p className="mt-1.5 max-w-[15rem] text-xs leading-relaxed text-text-secondary">
        Selecione um equipamento, área ou objeto na prancheta para editar suas propriedades.
      </p>
    </div>
  )
}
