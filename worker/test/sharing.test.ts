import { beforeEach, describe, expect, it } from 'vitest'
import { env } from 'cloudflare:test'
import { api, signupAndLogin } from './helpers'

async function resetD1() {
  const db = (env as unknown as { DB: D1Database }).DB
  await db.exec('DELETE FROM project_members')
  await db.exec('DELETE FROM projects')
  await db.exec('DELETE FROM password_reset_tokens')
  await db.exec('DELETE FROM sessions')
  await db.exec('DELETE FROM users')
}

beforeEach(async () => {
  await resetD1()
})

async function createProject(cookie: string, name: string): Promise<string> {
  const res = await api('/api/projects', { method: 'POST', cookie, body: JSON.stringify({ name }) })
  const body = await res.json<{ project: { id: string } }>()
  return body.project.id
}

async function invite(cookie: string, projectId: string, email: string) {
  return api(`/api/projects/${projectId}/members`, { method: 'POST', cookie, body: JSON.stringify({ email }) })
}

describe('compartilhamento — fluxo feliz owner → editor', () => {
  it('OWNER cria e compartilha; EDITOR encontra, abre, edita Layout/Flow e salva', async () => {
    const owner = await signupAndLogin('owner-feliz@example.com')
    const editor = await signupAndLogin('editor-feliz@example.com')
    const projectId = await createProject(owner.cookie, 'CD Guaratiba')

    const inviteRes = await invite(owner.cookie, projectId, editor.user.email)
    expect(inviteRes.status).toBe(201)
    const invited = await inviteRes.json<{ member: { role: string; email: string } }>()
    expect(invited.member.role).toBe('editor')

    // EDITOR encontra o projeto na própria listagem, com o papel e o e-mail do dono corretos.
    const listRes = await api('/api/projects', { cookie: editor.cookie })
    const list = await listRes.json<{ projects: { id: string; role: string; ownerEmail: string }[] }>()
    expect(list.projects).toHaveLength(1)
    expect(list.projects[0]?.id).toBe(projectId)
    expect(list.projects[0]?.role).toBe('editor')
    expect(list.projects[0]?.ownerEmail).toBe(owner.user.email)

    // EDITOR abre o projeto.
    const getRes = await api(`/api/projects/${projectId}`, { cookie: editor.cookie })
    expect(getRes.status).toBe(200)

    // EDITOR edita e salva o Layout.
    const layoutRes = await api(`/api/projects/${projectId}/layout`, {
      method: 'PUT',
      cookie: editor.cookie,
      body: JSON.stringify({ objects: [{ id: 'rack-1', objectType: 'rack' }] }),
    })
    expect(layoutRes.status).toBe(204)

    // EDITOR edita e salva o Flow.
    const flowRes = await api(`/api/projects/${projectId}/flow`, {
      method: 'PUT',
      cookie: editor.cookie,
      body: JSON.stringify({
        flowNodes: [{ id: 'n1', type: 'receiving', x: 0, y: 0 }],
        flowConnections: [],
      }),
    })
    expect(flowRes.status).toBe(204)

    // As mudanças do editor são visíveis para o dono — mesmo projeto, dado compartilhado de fato.
    const ownerView = await (await api(`/api/projects/${projectId}`, { cookie: owner.cookie })).json<{
      project: { objects: unknown[]; flowNodes: unknown[] }
    }>()
    expect(ownerView.project.objects).toHaveLength(1)
    expect(ownerView.project.flowNodes).toHaveLength(1)
  })
})

describe('compartilhamento — o que o EDITOR não pode fazer', () => {
  it('EDITOR não pode compartilhar (convidar um terceiro)', async () => {
    const owner = await signupAndLogin('owner-share@example.com')
    const editor = await signupAndLogin('editor-share@example.com')
    const third = await signupAndLogin('terceiro-share@example.com')
    const projectId = await createProject(owner.cookie, 'Projeto')
    await invite(owner.cookie, projectId, editor.user.email)

    const res = await invite(editor.cookie, projectId, third.user.email)
    expect(res.status).toBe(403)

    // O terceiro de fato não ganhou acesso algum.
    const thirdList = await (await api('/api/projects', { cookie: third.cookie })).json<{ projects: unknown[] }>()
    expect(thirdList.projects).toHaveLength(0)
  })

  it('EDITOR não pode remover colaboradores (nem a si mesmo, nem outros)', async () => {
    const owner = await signupAndLogin('owner-remove@example.com')
    const editor = await signupAndLogin('editor-remove@example.com')
    const projectId = await createProject(owner.cookie, 'Projeto')
    await invite(owner.cookie, projectId, editor.user.email)

    const res = await api(`/api/projects/${projectId}/members/${owner.user.id}`, {
      method: 'DELETE',
      cookie: editor.cookie,
    })
    expect(res.status).toBe(403)

    const selfRemove = await api(`/api/projects/${projectId}/members/${editor.user.id}`, {
      method: 'DELETE',
      cookie: editor.cookie,
    })
    expect(selfRemove.status).toBe(403)
  })

  it('EDITOR não pode excluir o projeto', async () => {
    const owner = await signupAndLogin('owner-delete@example.com')
    const editor = await signupAndLogin('editor-delete@example.com')
    const projectId = await createProject(owner.cookie, 'Projeto')
    await invite(owner.cookie, projectId, editor.user.email)

    const res = await api(`/api/projects/${projectId}`, { method: 'DELETE', cookie: editor.cookie })
    expect(res.status).toBe(403)

    // O projeto continua existindo e acessível ao dono.
    const getRes = await api(`/api/projects/${projectId}`, { cookie: owner.cookie })
    expect(getRes.status).toBe(200)
  })

  it('EDITOR não pode renomear o projeto (ação administrativa, não é "editar Layout/Flow")', async () => {
    const owner = await signupAndLogin('owner-rename@example.com')
    const editor = await signupAndLogin('editor-rename@example.com')
    const projectId = await createProject(owner.cookie, 'Nome Original')
    await invite(owner.cookie, projectId, editor.user.email)

    const res = await api(`/api/projects/${projectId}`, {
      method: 'PATCH',
      cookie: editor.cookie,
      body: JSON.stringify({ name: 'Sequestrado' }),
    })
    expect(res.status).toBe(403)
  })
})

describe('compartilhamento — revogação de acesso', () => {
  it('OWNER remove um colaborador e o acesso dele é revogado imediatamente', async () => {
    const owner = await signupAndLogin('owner-revoke@example.com')
    const editor = await signupAndLogin('editor-revoke@example.com')
    const projectId = await createProject(owner.cookie, 'Projeto')
    await invite(owner.cookie, projectId, editor.user.email)

    // Antes da remoção, o editor tem acesso de fato.
    expect((await api(`/api/projects/${projectId}`, { cookie: editor.cookie })).status).toBe(200)

    const removeRes = await api(`/api/projects/${projectId}/members/${editor.user.id}`, {
      method: 'DELETE',
      cookie: owner.cookie,
    })
    expect(removeRes.status).toBe(204)

    // Depois da remoção: nem leitura, nem escrita — 404 em tudo, como se nunca tivesse tido acesso.
    expect((await api(`/api/projects/${projectId}`, { cookie: editor.cookie })).status).toBe(404)
    const writeRes = await api(`/api/projects/${projectId}/layout`, {
      method: 'PUT',
      cookie: editor.cookie,
      body: JSON.stringify({ objects: [] }),
    })
    expect(writeRes.status).toBe(404)

    const listRes = await api('/api/projects', { cookie: editor.cookie })
    const list = await listRes.json<{ projects: unknown[] }>()
    expect(list.projects).toHaveLength(0)
  })

  it('o dono não pode ser removido através do endpoint de membros', async () => {
    const owner = await signupAndLogin('owner-protected@example.com')
    const projectId = await createProject(owner.cookie, 'Projeto')

    const res = await api(`/api/projects/${projectId}/members/${owner.user.id}`, {
      method: 'DELETE',
      cookie: owner.cookie,
    })
    expect(res.status).toBe(400)

    expect((await api(`/api/projects/${projectId}`, { cookie: owner.cookie })).status).toBe(200)
  })
})

describe('compartilhamento — sem bypass por ID e sem duplicidade', () => {
  it('usuário sem qualquer acesso não consegue abrir o projeto, mesmo sabendo o ID (404, não 403)', async () => {
    const owner = await signupAndLogin('owner-bypass@example.com')
    const stranger = await signupAndLogin('estranho-bypass@example.com')
    const projectId = await createProject(owner.cookie, 'Privado')

    const res = await api(`/api/projects/${projectId}`, { cookie: stranger.cookie })
    expect(res.status).toBe(404)

    const layoutRes = await api(`/api/projects/${projectId}/layout`, {
      method: 'PUT',
      cookie: stranger.cookie,
      body: JSON.stringify({ objects: [{ id: 'invasor', objectType: 'wall' }] }),
    })
    expect(layoutRes.status).toBe(404)

    const membersRes = await api(`/api/projects/${projectId}/members`, { cookie: stranger.cookie })
    expect(membersRes.status).toBe(404)
  })

  it('convidar a mesma pessoa duas vezes é rejeitado (sem membro duplicado)', async () => {
    const owner = await signupAndLogin('owner-dup@example.com')
    const editor = await signupAndLogin('editor-dup@example.com')
    const projectId = await createProject(owner.cookie, 'Projeto')

    expect((await invite(owner.cookie, projectId, editor.user.email)).status).toBe(201)
    const secondInvite = await invite(owner.cookie, projectId, editor.user.email)
    expect(secondInvite.status).toBe(409)

    const members = await (await api(`/api/projects/${projectId}/members`, { cookie: owner.cookie })).json<{
      members: { email: string }[]
    }>()
    expect(members.members.filter((m) => m.email === editor.user.email)).toHaveLength(1)
  })

  it('convidar um e-mail sem conta ARGUS.LLP retorna 404 sem criar membro', async () => {
    const owner = await signupAndLogin('owner-noaccount@example.com')
    const projectId = await createProject(owner.cookie, 'Projeto')

    const res = await invite(owner.cookie, projectId, 'ninguem@example.com')
    expect(res.status).toBe(404)

    const members = await (await api(`/api/projects/${projectId}/members`, { cookie: owner.cookie })).json<{
      members: unknown[]
    }>()
    expect(members.members).toHaveLength(1) // só o dono
  })

  it('o dono não pode convidar a si mesmo', async () => {
    const owner = await signupAndLogin('owner-self@example.com')
    const projectId = await createProject(owner.cookie, 'Projeto')

    const res = await invite(owner.cookie, projectId, owner.user.email)
    expect(res.status).toBe(400)
  })
})

describe('compartilhamento — listagem "meus projetos" vs "compartilhados comigo"', () => {
  it('projetos próprios têm role owner; projetos compartilhados têm role editor com o e-mail do dono', async () => {
    const owner = await signupAndLogin('owner-list@example.com')
    const editor = await signupAndLogin('editor-list@example.com')
    await createProject(owner.cookie, 'Meu projeto')
    const sharedId = await createProject(owner.cookie, 'Projeto compartilhado')
    await invite(owner.cookie, sharedId, editor.user.email)
    await createProject(editor.cookie, 'Projeto próprio do editor')

    const editorList = await (await api('/api/projects', { cookie: editor.cookie })).json<{
      projects: { name: string; role: string; ownerEmail: string }[]
    }>()
    expect(editorList.projects).toHaveLength(2)
    const own = editorList.projects.find((p) => p.name === 'Projeto próprio do editor')
    const shared = editorList.projects.find((p) => p.name === 'Projeto compartilhado')
    expect(own?.role).toBe('owner')
    expect(shared?.role).toBe('editor')
    expect(shared?.ownerEmail).toBe(owner.user.email)
  })
})
