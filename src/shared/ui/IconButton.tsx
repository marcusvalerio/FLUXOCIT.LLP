import type { ButtonHTMLAttributes } from 'react'
import { Tooltip } from './Tooltip'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  label: string
  /** Compact 32px square — for dense clusters (controles flutuantes do canvas, cabeçalho). */
  size?: 'md' | 'sm'
  /** Mostra a dica flutuante do design system em vez do tooltip nativo do navegador. */
  tooltip?: boolean
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
}

const SIZE_CLASSES = {
  md: 'w-11 h-11 md:w-9 md:h-9',
  sm: 'w-9 h-9 md:w-8 md:h-8',
} as const

export function IconButton({
  active,
  label,
  size = 'md',
  tooltip = false,
  tooltipSide = 'top',
  className = '',
  children,
  ...props
}: IconButtonProps) {
  const button = (
    <button
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={tooltip ? undefined : label}
      className={`inline-flex items-center justify-center rounded-lg transition-[color,background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.93] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${SIZE_CLASSES[size]} ${
        active
          ? 'bg-primary/10 text-primary ring-1 ring-primary/25'
          : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )

  if (!tooltip) return button
  return (
    <Tooltip label={label} side={tooltipSide}>
      {button}
    </Tooltip>
  )
}
