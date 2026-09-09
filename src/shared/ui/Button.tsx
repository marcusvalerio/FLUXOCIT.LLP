import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow',
  secondary: 'bg-surface text-text-primary border border-border hover:bg-surface-alt hover:border-border-strong',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-alt hover:text-text-primary',
  danger: 'bg-surface text-danger border border-danger/40 hover:bg-danger/10',
}

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'px-4 min-h-11 md:min-h-9 text-sm',
  sm: 'px-3 min-h-9 md:min-h-8 text-[13px]',
}

export function Button({ variant = 'secondary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
