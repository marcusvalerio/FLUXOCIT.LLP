interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Rótulo do grupo para leitores de tela (ex.: "Prancheta"). */
  ariaLabel: string
  size?: 'md' | 'sm'
  className?: string
}

/**
 * Alternador de contexto (Layout ↔ Fluxo, abas do painel de propriedades). O indicador é o
 * próprio botão ativo — superfície elevada sobre o trilho — e a transição é curta o bastante
 * para explicar a troca sem virar animação de destaque.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-1.5 text-sm'
  return (
    <div role="tablist" aria-label={ariaLabel} className={`inline-flex items-center gap-0.5 rounded-lg bg-surface-alt p-0.5 ${className}`}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-[7px] font-medium transition-[color,background-color,box-shadow] duration-150 ease-out ${pad} ${
              selected
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
