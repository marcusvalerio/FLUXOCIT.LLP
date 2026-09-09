import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'

// O editor real monta Konva (canvas), que não roda em jsdom — aqui só interessa saber que a rota
// /editor/:layoutId abre o editor em vez de redirecionar para autenticação.
vi.mock('../features/editor/EditorPage', () => ({
  EditorPage: () => <div>editor-aberto</div>,
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** O app abre direto no ambiente de projetos — nenhuma rota leva o usuário para /login. */
describe('App — navegação sem autenticação', () => {
  it('entra em /projects a partir da raiz', async () => {
    renderAt('/')
    expect(await screen.findByText('Meus projetos')).toBeInTheDocument()
  })

  it('abre /projects sem pedir login', async () => {
    renderAt('/projects')
    expect(await screen.findByText('Meus projetos')).toBeInTheDocument()
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /entrar/i })).not.toBeInTheDocument()
  })

  it('abre /editor/:layoutId sem pedir login', async () => {
    renderAt('/editor/qualquer-id')
    expect(await screen.findByText('editor-aberto')).toBeInTheDocument()
  })

  it('manda rotas antigas de autenticação para o ambiente de projetos', async () => {
    for (const path of ['/login', '/signup', '/forgot-password', '/reset-password', '/layouts']) {
      const { unmount } = renderAt(path)
      expect(await screen.findByText('Meus projetos')).toBeInTheDocument()
      unmount()
    }
  })

  it('não faz nenhuma chamada de sessão no boot', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    renderAt('/')
    await screen.findByText('Meus projetos')

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
