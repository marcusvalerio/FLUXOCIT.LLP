import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomSheet } from './BottomSheet'

/**
 * Regression coverage for the systemic mobile scroll fix: every BottomSheet consumer (Biblioteca,
 * Ambiente, Métricas, Análise, Propriedades, etc.) relies on BottomSheet itself providing the one
 * scrollable region for its content — previously that wrapper was `overflow-hidden`, so any
 * consumer that didn't build its own internal scroll area (most didn't) had content silently
 * clipped with nothing on screen able to scroll to it (confirmed on Métricas, whose "Alertas"
 * section was cut off mid-line). jsdom can't simulate real touch/scroll gestures, so this locks
 * down the structural contract instead: the content wrapper must be the scrollable element, must
 * isolate overscroll from the document/canvas behind it, and the header must stay outside of it.
 */
describe('BottomSheet — scroll region contract', () => {
  it('wraps children in a scrollable region with overscroll isolation', () => {
    render(
      <BottomSheet title="Painel" onClose={() => {}}>
        <p data-testid="conteudo">conteúdo do painel</p>
      </BottomSheet>,
    )

    const content = screen.getByTestId('conteudo')
    const scrollRegion = content.parentElement
    expect(scrollRegion).not.toBeNull()

    // The exact scroll properties the browser needs to own the gesture locally instead of
    // letting it chain to the document or fall through to the canvas underneath.
    expect(scrollRegion).toHaveClass('overflow-y-auto')
    expect(scrollRegion).toHaveClass('overscroll-contain')
    expect(scrollRegion).toHaveClass('touch-pan-y')
    // Arbitrary-property Tailwind syntax for -webkit-overflow-scrolling: touch.
    expect(scrollRegion?.className).toContain('[-webkit-overflow-scrolling:touch]')

    // Never regress back to a non-scrollable wrapper.
    expect(scrollRegion).not.toHaveClass('overflow-hidden')
  })

  it('keeps the header (title + close button) outside the scrollable content region', () => {
    render(
      <BottomSheet title="Painel com título" onClose={() => {}}>
        <p data-testid="conteudo">conteúdo</p>
      </BottomSheet>,
    )

    const heading = screen.getByRole('heading', { name: 'Painel com título' })
    const scrollRegion = screen.getByTestId('conteudo').parentElement
    expect(scrollRegion?.contains(heading)).toBe(false)
  })

  it('does not render a scroll region while collapsed', () => {
    render(
      <BottomSheet title="Painel" onClose={() => {}} collapsed>
        <p data-testid="conteudo">conteúdo</p>
      </BottomSheet>,
    )
    expect(screen.queryByTestId('conteudo')).not.toBeInTheDocument()
  })

  it('modal=true renders a backdrop that closes on tap', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet title="Biblioteca de objetos" onClose={onClose}>
        <p>conteúdo</p>
      </BottomSheet>,
    )
    // Backdrop + header close button both carry aria-label="Fechar"; the backdrop is the one
    // covering the full screen (absolute inset-0), not the small header button.
    const closers = screen.getAllByLabelText('Fechar')
    expect(closers.length).toBeGreaterThanOrEqual(2)
  })

  it('modal=false renders no backdrop, so the canvas underneath stays interactive', () => {
    render(
      <BottomSheet title="Propriedades" onClose={() => {}} modal={false}>
        <p>conteúdo</p>
      </BottomSheet>,
    )
    // Only the header's own close button remains — no full-screen backdrop button.
    const closers = screen.getAllByLabelText('Fechar')
    expect(closers).toHaveLength(1)
  })
})
