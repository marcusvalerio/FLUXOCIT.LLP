import type { ReactNode } from 'react'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  label: string
  side?: TooltipSide
  children: ReactNode
  className?: string
}

const SIDE_CLASSES: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

/**
 * Dica textual em CSS puro (sem dependência nova): aparece no hover e no foco por teclado, com
 * um atraso curto para não piscar enquanto o cursor apenas atravessa a barra de ferramentas.
 *
 * O gatilho continua responsável pelo próprio `aria-label` — o balão é `aria-hidden`, para o
 * leitor de tela não anunciar o mesmo texto duas vezes. Em telas de toque ele nunca aparece
 * (não há hover), então nenhum controle depende dele para ser compreendido.
 */
export function Tooltip({ label, side = 'top', children, className = '' }: TooltipProps) {
  return (
    <span className={`relative inline-flex group/tooltip ${className}`}>
      {children}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-text-primary px-2 py-1 text-[11px] font-medium leading-none text-bg opacity-0 shadow-sm transition-opacity duration-150 ease-out delay-0 group-hover/tooltip:opacity-100 group-hover/tooltip:delay-300 group-focus-within/tooltip:opacity-100 ${SIDE_CLASSES[side]}`}
      >
        {label}
      </span>
    </span>
  )
}
