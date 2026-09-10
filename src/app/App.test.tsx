import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// O editor real monta Konva (canvas), que não roda em jsdom — aqui só interessa saber qual
// experiência cada modo entrega.
vi.mock('../features/editor/EditorPage', () => ({
  EditorPage: () => <div>editor-aberto</div>,
}))

// O modo é decidido pela configuração do ambiente; o teste controla essa decisão — inclusive no
// apiClient, para que o modo conta realmente chegue a falar com a rede.
const accountModeMock = vi.hoisted(() => ({ enabled: false }))
vi.mock('../shared/data/authMode', () => ({
  isAccountModeEnabled: () => accountModeMock.enabled,
}))
// A verificação de sessão do boot é observada aqui: `apiFetch` é o ponto por onde o app fala
// com o Worker. Mantemos ApiError real para o store tratar a falha como "sem sessão".
const apiFetchMock = vi.hoisted(() => vi.fn())
vi.mock('../shared/data/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/data/apiClient')>()
  return { ...actual, isRemoteApiConfigured: () => accountModeMock.enabled, apiFetch: apiFetchMock }
})

const { App } = await import('./App')

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  accountModeMock.enabled = false
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Modo local (sem VITE_API_BASE_URL): o ARGUS abre direto, sem conta. */
describe('App — modo local', () => {
  it('entra em /projects a partir da raiz', async () => {
    renderAt('/')
    expect(await screen.findByText('Meus projetos')).toBeInTheDocument()
  })

  it('abre /projects e /editor/:id sem pedir login', async () => {
    renderAt('/projects')
    expect(await screen.findByText('Meus projetos')).toBeInTheDocument()
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()

    const { unmount } = renderAt('/editor/qualquer-id')
    expect(await screen.findByText('editor-aberto')).toBeInTheDocument()
    unmount()
  })

  it('manda as rotas de autenticação para o ambiente de projetos', async () => {
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

  it('não mostra identidade de conta nem saída', async () => {
    renderAt('/projects')
    await screen.findByText('Meus projetos')
    expect(screen.queryByLabelText('Sair da conta')).not.toBeInTheDocument()
  })
})

/** Modo conta (VITE_API_BASE_URL configurado): sessão exigida, telas de login de volta ao fluxo. */
describe('App — modo conta', () => {
  beforeEach(async () => {
    accountModeMock.enabled = true
    const { ApiError } = await import('../shared/data/apiClient')
    // Sem sessão válida, o Worker responde 401 — é o caso que o gate precisa tratar.
    apiFetchMock.mockReset()
    apiFetchMock.mockRejectedValue(new ApiError(401, 'Sessão expirada ou inexistente.'))
  })

  it('verifica a sessão no boot antes de decidir a rota', async () => {
    renderAt('/projects')
    await screen.findByRole('heading', { name: /entrar/i })
    expect(apiFetchMock).toHaveBeenCalledWith('/api/auth/me')
  })

  it('leva /projects para o login quando não há sessão', async () => {
    renderAt('/projects')
    expect(await screen.findByRole('heading', { name: /entrar/i })).toBeInTheDocument()
  })

  it('protege também /editor/:layoutId', async () => {
    renderAt('/editor/projeto-de-outro')
    expect(await screen.findByRole('heading', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.queryByText('editor-aberto')).not.toBeInTheDocument()
  })

  it('mantém as telas de cadastro e recuperação de senha acessíveis', async () => {
    const { unmount } = renderAt('/signup')
    expect(await screen.findByRole('heading', { name: /criar conta/i })).toBeInTheDocument()
    unmount()

    renderAt('/forgot-password')
    expect(await screen.findByRole('heading', { name: /recuperar|esqueci|redefinir/i })).toBeInTheDocument()
  })
})
