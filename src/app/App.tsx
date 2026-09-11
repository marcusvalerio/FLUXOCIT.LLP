import { Navigate, Route, Routes } from 'react-router-dom'
import { LayoutsListPage } from '../features/layouts/LayoutsListPage'
import { EditorPage } from '../features/editor/EditorPage'
import { LandingPage } from '../features/landing/LandingPage'
import { AuthBootstrap, RedirectIfAuthed, RequireAuth } from '../features/auth/AuthGate'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { SignupPage } from '../features/auth/pages/SignupPage'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage'
import { ChangePasswordPage } from '../features/auth/pages/ChangePasswordPage'
import { isAccountModeEnabled } from '../shared/data/authMode'

/**
 * Rotas do ARGUS.LLP — modo local, sem conta.
 *
 * O app entra direto no ambiente de projetos: `/` redireciona para `/projects`, e tanto
 * `/projects` quanto `/editor/:layoutId` abrem sem qualquer verificação de sessão. Nenhum
 * caminho de navegação leva a uma tela de login, inclusive as rotas antigas de autenticação.
 */
function LocalRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/projects" element={<LayoutsListPage />} />
      {/* Rota antiga (pré-Fase 9) — mantida como redirecionamento silencioso. */}
      <Route path="/layouts" element={<Navigate to="/projects" replace />} />
      <Route path="/editor/:layoutId" element={<EditorPage />} />
      {/* Landing institucional — página de marca, aberta sem sessão em qualquer modo (ver
          AccountRoutes abaixo). Não é o destino padrão de `/`: o app continua abrindo direto em
          `/projects`, preservando o comportamento existente. */}
      <Route path="/welcome" element={<LandingPage />} />

      {/* Qualquer outra rota (inclusive /login e /signup) cai no ambiente de projetos — no modo
          local não existe conta para acessar. */}
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  )
}

/**
 * Rotas do ARGUS.LLP — modo conta (multiusuário).
 *
 * Só entra em cena quando existe uma API configurada (ver shared/data/authMode). A sessão é
 * verificada uma vez no boot (`AuthBootstrap`), `/projects` e `/editor/:id` exigem sessão, e a
 * troca obrigatória de senha no primeiro acesso continua bloqueando o resto do app.
 *
 * O gate aqui é de **experiência**: a autorização real acontece no Worker, que valida sessão e
 * dono do projeto em toda rota (worker/src/middleware.ts + routes/projects.ts).
 */
function AccountRoutes() {
  return (
    <AuthBootstrap>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        {/* Landing institucional — pública, sem RequireAuth (a página em si já direciona "Começar
            agora" para /signup, que RedirectIfAuthed já trata para quem já tem sessão). */}
        <Route path="/welcome" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthed>
              <SignupPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RedirectIfAuthed>
              <ForgotPasswordPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/reset-password"
          element={
            <RedirectIfAuthed>
              <ResetPasswordPage />
            </RedirectIfAuthed>
          }
        />

        <Route
          path="/change-password"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />
        <Route
          path="/projects"
          element={
            <RequireAuth>
              <LayoutsListPage />
            </RequireAuth>
          }
        />
        <Route path="/layouts" element={<Navigate to="/projects" replace />} />
        <Route
          path="/editor/:layoutId"
          element={
            <RequireAuth>
              <EditorPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </AuthBootstrap>
  )
}

/**
 * O modo é decidido pela configuração do ambiente, não por uma flag na interface: sem
 * `VITE_API_BASE_URL` o ARGUS é uma ferramenta local; com ela, é multiusuário. Assim a mesma
 * base de código atende a equipe hoje e o produto com contas quando a infraestrutura existir,
 * sem duas versões do app para manter.
 */
export function App() {
  return isAccountModeEnabled() ? <AccountRoutes /> : <LocalRoutes />
}
