import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from './LandingPage'

const accountModeMock = vi.hoisted(() => ({ enabled: false }))
vi.mock('../../shared/data/authMode', () => ({
  isAccountModeEnabled: () => accountModeMock.enabled,
}))

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

beforeEach(() => {
  accountModeMock.enabled = false
  navigateMock.mockClear()
})

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

describe('LandingPage — narrativa e navegação', () => {
  it('renderiza a headline do Hero e os seis capítulos', () => {
    renderLanding()
    expect(screen.getByRole('heading', { name: /Planejar o espaço\./ })).toBeInTheDocument()
    expect(screen.getByText('Comece pelo espaço.')).toBeInTheDocument()
    expect(screen.getByText(/O Flow mostra como\./)).toBeInTheDocument()
    expect(screen.getByText('Quando o desenho começa a responder.')).toBeInTheDocument()
    expect(screen.getByText('Planejamento não precisa acontecer sozinho.')).toBeInTheDocument()
    expect(screen.getByText('O próximo passo é entender o que acontece.')).toBeInTheDocument()
    expect(screen.getByText(/Um planejamento melhor/)).toBeInTheDocument()
  })

  it('marca Simulation como visão futura, não uma funcionalidade pronta', () => {
    renderLanding()
    expect(screen.getByText('Simulation')).toBeInTheDocument()
    expect(screen.getByText('Visão futura')).toBeInTheDocument()
  })

  it('"Começar agora" no modo local vai para /projects', () => {
    renderLanding()
    fireEvent.click(screen.getAllByRole('button', { name: 'Começar agora' })[0]!)
    expect(navigateMock).toHaveBeenCalledWith('/projects')
  })

  it('"Começar agora" no modo conta vai para /signup, e a navbar mostra "Entrar"', () => {
    accountModeMock.enabled = true
    renderLanding()
    expect(screen.getByText('Entrar')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Começar agora' })[0]!)
    expect(navigateMock).toHaveBeenCalledWith('/signup')
  })

  it('não mostra "Entrar" no modo local (não existe conta para acessar)', () => {
    renderLanding()
    expect(screen.queryByText('Entrar')).not.toBeInTheDocument()
  })
})
