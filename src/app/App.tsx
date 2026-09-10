import { Navigate, Route, Routes } from 'react-router-dom'
import { LayoutsListPage } from '../features/layouts/LayoutsListPage'
import { EditorPage } from '../features/editor/EditorPage'

/**
 * Rotas do ARGUS.LLP — versão local, sem conta.
 *
 * O app entra direto no ambiente de projetos: `/` redireciona para `/projects`, e tanto
 * `/projects` quanto `/editor/:layoutId` abrem sem qualquer verificação de sessão. Não existe
 * mais nenhum caminho de navegação que leve o usuário para uma tela de login.
 *
 * O código de autenticação (features/auth) e a persistência remota (shared/data/
 * RemoteLayoutRepository + worker/) continuam no repositório, intactos, para a futura versão
 * multiusuário — apenas não fazem parte do fluxo atual. Ver docs/ARCHITECTURE.md
 * § Persistência.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/projects" element={<LayoutsListPage />} />
      {/* Rota antiga (pré-Fase 9) — mantida como redirecionamento silencioso. */}
      <Route path="/layouts" element={<Navigate to="/projects" replace />} />
      <Route path="/editor/:layoutId" element={<EditorPage />} />

      {/* Qualquer outra rota (inclusive as antigas de autenticação, como /login e /signup)
          cai no ambiente de projetos — nunca em uma tela de login. */}
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  )
}
