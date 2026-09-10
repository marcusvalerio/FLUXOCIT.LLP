import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandMark } from '../../shared/ui/BrandMark'
import { ThemeToggle } from '../../shared/ui/ThemeToggle'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Shared chrome for every auth screen (login, cadastro, troca/recuperação de senha) — same
 * header/branding as the rest of the app so these never read as a bolted-on third-party page. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <header className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <BrandMark size={24} title={null} className="text-text-primary" />
          <h1 className="font-display text-lg font-semibold text-text-primary">
            ARGUS<span className="text-primary">.LLP</span>
          </h1>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h2 className="font-heading text-xl font-semibold text-text-primary">{title}</h2>
            {subtitle && <p className="text-sm text-text-secondary mt-1.5">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-danger/10 text-danger text-sm p-3 mb-4">
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-success/10 text-success text-sm p-3 mb-4">
      <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}
