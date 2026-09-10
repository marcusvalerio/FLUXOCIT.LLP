import { Hono } from 'hono'
import {
  createPasswordResetToken,
  createUser,
  deleteAllSessionsForUser,
  findUserByEmail,
  updateUserPassword,
  consumePasswordResetToken,
} from '../db'
import { generateTempPassword, generateToken, hashPassword, hashToken, verifyPassword } from '../crypto'
import { getEmailSender } from '../email'
import { readJsonBody } from '../http'
import { clearSession, getSessionUser, issueSession } from '../session'
import type { Env } from '../types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const authRoutes = new Hono<{ Bindings: Env }>()

function toPublicUser(user: { id: string; email: string; mustChangePassword: boolean }) {
  return { id: user.id, email: user.email, mustChangePassword: user.mustChangePassword }
}

authRoutes.post('/signup', async (c) => {
  const body = await readJsonBody<{ email?: string }>(c)
  const email = body.email?.trim().toLowerCase() ?? ''
  if (!EMAIL_RE.test(email)) {
    return c.json({ error: 'E-mail inválido.' }, 400)
  }

  const existing = await findUserByEmail(c.env, email)
  if (existing) {
    return c.json({ error: 'Este e-mail já possui uma conta. Faça login ou recupere sua senha.' }, 409)
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await hashPassword(tempPassword)
  await createUser(c.env, email, passwordHash)

  await getEmailSender(c.env).send({
    to: email,
    subject: 'Sua senha de acesso ao ARGUS.LLP',
    text: [
      'Sua conta no ARGUS.LLP foi criada.',
      '',
      `Senha temporária: ${tempPassword}`,
      '',
      'Use essa senha para entrar pela primeira vez — você será solicitado a definir uma nova senha em seguida.',
      'Se você não solicitou esta conta, ignore este e-mail.',
    ].join('\n'),
  })

  return c.json({ email }, 201)
})

authRoutes.post('/login', async (c) => {
  const body = await readJsonBody<{ email?: string; password?: string }>(c)
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  if (!email || !password) {
    return c.json({ error: 'Informe e-mail e senha.' }, 400)
  }

  const user = await findUserByEmail(c.env, email)
  const validPassword = user ? await verifyPassword(password, user.password_hash) : false
  if (!user || !validPassword) {
    return c.json({ error: 'E-mail ou senha inválidos.' }, 401)
  }

  await issueSession(c, user.id)
  return c.json({
    user: toPublicUser({ id: user.id, email: user.email, mustChangePassword: user.must_change_password === 1 }),
  })
})

authRoutes.post('/logout', async (c) => {
  await clearSession(c)
  return c.body(null, 204)
})

authRoutes.get('/me', async (c) => {
  const user = await getSessionUser(c)
  if (!user) return c.json({ error: 'Sessão expirada ou inexistente.' }, 401)
  return c.json({ user: toPublicUser(user) })
})

authRoutes.post('/change-password', async (c) => {
  const sessionUser = await getSessionUser(c)
  if (!sessionUser) return c.json({ error: 'Sessão expirada ou inexistente.' }, 401)

  const body = await readJsonBody<{ currentPassword?: string; newPassword?: string }>(c)
  const currentPassword = body.currentPassword ?? ''
  const newPassword = body.newPassword ?? ''
  if (newPassword.length < 8) {
    return c.json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, 400)
  }

  const user = await findUserByEmail(c.env, sessionUser.email)
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    return c.json({ error: 'Senha atual incorreta.' }, 401)
  }

  const newHash = await hashPassword(newPassword)
  await updateUserPassword(c.env, user.id, newHash, false)
  // Trocar a senha invalida todas as sessões (inclusive a atual) — força um login limpo com a
  // nova senha, e uma nova sessão é emitida na sequência para não deslogar quem acabou de trocar.
  await deleteAllSessionsForUser(c.env, user.id)
  await issueSession(c, user.id)

  return c.json({ user: toPublicUser({ id: user.id, email: user.email, mustChangePassword: false }) })
})

authRoutes.post('/forgot-password', async (c) => {
  const body = await readJsonBody<{ email?: string }>(c)
  const email = body.email?.trim().toLowerCase() ?? ''

  // Resposta genérica sempre — não revela se o e-mail existe (diferente do /signup, onde a
  // clareza da UX de "já tem conta" importa mais do que o risco de enumeração aqui).
  const genericResponse = {
    message: 'Se este e-mail estiver cadastrado, enviaremos instruções de recuperação em instantes.',
  }

  const user = email && EMAIL_RE.test(email) ? await findUserByEmail(c.env, email) : null
  if (!user) return c.json(genericResponse)

  const token = generateToken()
  await createPasswordResetToken(c.env, user.id, await hashToken(token))

  const resetUrl = `${c.env.FRONTEND_ORIGIN}/reset-password?token=${token}`
  await getEmailSender(c.env).send({
    to: user.email,
    subject: 'Redefinição de senha — ARGUS.LLP',
    text: [
      'Recebemos um pedido para redefinir sua senha no ARGUS.LLP.',
      '',
      `Acesse o link abaixo para escolher uma nova senha (válido por 1 hora):`,
      resetUrl,
      '',
      'Se você não pediu isso, ignore este e-mail — sua senha continua a mesma.',
    ].join('\n'),
  })

  return c.json(genericResponse)
})

authRoutes.post('/reset-password', async (c) => {
  const body = await readJsonBody<{ token?: string; newPassword?: string }>(c)
  const token = body.token ?? ''
  const newPassword = body.newPassword ?? ''
  if (!token || newPassword.length < 8) {
    return c.json({ error: 'Link inválido ou senha muito curta (mínimo 8 caracteres).' }, 400)
  }

  const consumed = await consumePasswordResetToken(c.env, await hashToken(token))
  if (!consumed) {
    return c.json({ error: 'Link de redefinição inválido ou expirado. Solicite um novo.' }, 400)
  }

  const newHash = await hashPassword(newPassword)
  await updateUserPassword(c.env, consumed.userId, newHash, false)
  await deleteAllSessionsForUser(c.env, consumed.userId)

  return c.json({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' })
})
