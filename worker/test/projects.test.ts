import { beforeEach, describe, expect, it } from 'vitest'
import { env } from 'cloudflare:test'
import { api, signupAndLogin } from './helpers'

async function resetD1() {
  const db = (env as unknown as { DB: D1Database }).DB
  await db.exec('DELETE FROM projects')
  await db.exec('DELETE FROM password_reset_tokens')
  await db.exec('DELETE FROM sessions')
  await db.exec('DELETE FROM users')
}

beforeEach(async () => {
  await resetD1()
})

describe('projects CRUD', () => {
  it('rejeita qualquer rota sem sessão', async () => {
    const res = await api('/api/projects')
    expect(res.status).toBe(401)
  })

  it('cria e lista um projeto do usuário', async () => {
    const { cookie } = await signupAndLogin('dono@example.com')
    const createRes = await api('/api/projects', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ name: 'Galpão A', widthM: 20, heightM: 15 }),
    })
    expect(createRes.status).toBe(201)
    const created = await createRes.json<{ project: { id: string; name: string } }>()

    const listRes = await api('/api/projects', { cookie })
    const list = await listRes.json<{ projects: { id: string; name: string }[] }>()
    expect(list.projects).toHaveLength(1)
    expect(list.projects[0]?.id).toBe(created.project.id)
  })

  it('renomeia um projeto', async () => {
    const { cookie } = await signupAndLogin('renomear@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie, body: JSON.stringify({ name: 'Original' }) })
    ).json<{ project: { id: string } }>()

    const renameRes = await api(`/api/projects/${created.project.id}`, {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ name: 'Renomeado' }),
    })
    expect(renameRes.status).toBe(204)

    const getRes = await api(`/api/projects/${created.project.id}`, { cookie })
    const got = await getRes.json<{ project: { name: string } }>()
    expect(got.project.name).toBe('Renomeado')
  })

  it('duplica um projeto preservando layout/fluxo', async () => {
    const { cookie } = await signupAndLogin('duplicar@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie, body: JSON.stringify({ name: 'Base' }) })
    ).json<{ project: { id: string } }>()

    await api(`/api/projects/${created.project.id}/layout`, {
      method: 'PUT',
      cookie,
      body: JSON.stringify({ objects: [{ id: 'o1', objectType: 'wall' }] }),
    })

    const dupRes = await api(`/api/projects/${created.project.id}/duplicate`, { method: 'POST', cookie })
    expect(dupRes.status).toBe(201)
    const dup = await dupRes.json<{ project: { id: string; name: string; objects: unknown[] } }>()
    expect(dup.project.id).not.toBe(created.project.id)
    expect(dup.project.name).toContain('cópia')
    expect(dup.project.objects).toHaveLength(1)

    const listRes = await api('/api/projects', { cookie })
    const list = await listRes.json<{ projects: unknown[] }>()
    expect(list.projects).toHaveLength(2)
  })

  it('exclui um projeto', async () => {
    const { cookie } = await signupAndLogin('excluir@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie, body: JSON.stringify({ name: 'Descartável' }) })
    ).json<{ project: { id: string } }>()

    const deleteRes = await api(`/api/projects/${created.project.id}`, { method: 'DELETE', cookie })
    expect(deleteRes.status).toBe(204)

    const getRes = await api(`/api/projects/${created.project.id}`, { cookie })
    expect(getRes.status).toBe(404)
  })

  it('persiste layout e fluxo separadamente e incrementa a versão', async () => {
    const { cookie } = await signupAndLogin('persistir@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie, body: JSON.stringify({ name: 'Projeto' }) })
    ).json<{ project: { id: string; version: number } }>()
    expect(created.project.version).toBe(1)

    const layoutRes = await api(`/api/projects/${created.project.id}/layout`, {
      method: 'PUT',
      cookie,
      body: JSON.stringify({ objects: [{ id: 'o1', objectType: 'rack' }], widthM: 30 }),
    })
    expect(layoutRes.status).toBe(204)

    const flowRes = await api(`/api/projects/${created.project.id}/flow`, {
      method: 'PUT',
      cookie,
      body: JSON.stringify({
        flowNodes: [{ id: 'n1', type: 'receiving', name: 'Recebimento', x: 0, y: 0 }],
        flowConnections: [],
      }),
    })
    expect(flowRes.status).toBe(204)

    const getRes = await api(`/api/projects/${created.project.id}`, { cookie })
    const got = await getRes.json<{
      project: { objects: unknown[]; flowNodes: unknown[]; widthM: number; version: number }
    }>()
    expect(got.project.objects).toHaveLength(1)
    expect(got.project.flowNodes).toHaveLength(1)
    expect(got.project.widthM).toBe(30)
    expect(got.project.version).toBe(3) // 1 (criação) + 1 (layout) + 1 (flow)
  })
})

describe('isolamento entre usuários', () => {
  it('um usuário não vê projetos de outro na listagem', async () => {
    const a = await signupAndLogin('isolado-a@example.com')
    const b = await signupAndLogin('isolado-b@example.com')

    await api('/api/projects', { method: 'POST', cookie: a.cookie, body: JSON.stringify({ name: 'Projeto de A' }) })

    const listB = await api('/api/projects', { cookie: b.cookie })
    const bodyB = await listB.json<{ projects: unknown[] }>()
    expect(bodyB.projects).toHaveLength(0)
  })

  it('um usuário não consegue ler o projeto de outro por ID (404, não 403)', async () => {
    const a = await signupAndLogin('leitura-a@example.com')
    const b = await signupAndLogin('leitura-b@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie: a.cookie, body: JSON.stringify({ name: 'Privado' }) })
    ).json<{ project: { id: string } }>()

    const res = await api(`/api/projects/${created.project.id}`, { cookie: b.cookie })
    expect(res.status).toBe(404)
  })

  it('um usuário não consegue renomear o projeto de outro', async () => {
    const a = await signupAndLogin('renomear-a@example.com')
    const b = await signupAndLogin('renomear-b@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie: a.cookie, body: JSON.stringify({ name: 'Original' }) })
    ).json<{ project: { id: string } }>()

    const res = await api(`/api/projects/${created.project.id}`, {
      method: 'PATCH',
      cookie: b.cookie,
      body: JSON.stringify({ name: 'Sequestrado' }),
    })
    expect(res.status).toBe(404)

    const getRes = await api(`/api/projects/${created.project.id}`, { cookie: a.cookie })
    const got = await getRes.json<{ project: { name: string } }>()
    expect(got.project.name).toBe('Original')
  })

  it('um usuário não consegue excluir o projeto de outro', async () => {
    const a = await signupAndLogin('excluir-a@example.com')
    const b = await signupAndLogin('excluir-b@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie: a.cookie, body: JSON.stringify({ name: 'Intacto' }) })
    ).json<{ project: { id: string } }>()

    const res = await api(`/api/projects/${created.project.id}`, { method: 'DELETE', cookie: b.cookie })
    expect(res.status).toBe(404)

    const getRes = await api(`/api/projects/${created.project.id}`, { cookie: a.cookie })
    expect(getRes.status).toBe(200)
  })

  it('um usuário não consegue sobrescrever o layout do projeto de outro', async () => {
    const a = await signupAndLogin('layout-a@example.com')
    const b = await signupAndLogin('layout-b@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie: a.cookie, body: JSON.stringify({ name: 'Meu layout' }) })
    ).json<{ project: { id: string } }>()

    const res = await api(`/api/projects/${created.project.id}/layout`, {
      method: 'PUT',
      cookie: b.cookie,
      body: JSON.stringify({ objects: [{ id: 'invasor', objectType: 'wall' }] }),
    })
    expect(res.status).toBe(404)

    const getRes = await api(`/api/projects/${created.project.id}`, { cookie: a.cookie })
    const got = await getRes.json<{ project: { objects: unknown[] } }>()
    expect(got.project.objects).toHaveLength(0)
  })

  it('um usuário não consegue sobrescrever o Fluxo do projeto de outro', async () => {
    const a = await signupAndLogin('flow-a@example.com')
    const b = await signupAndLogin('flow-b@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie: a.cookie, body: JSON.stringify({ name: 'Meu fluxo' }) })
    ).json<{ project: { id: string } }>()

    // O dono grava seu fluxo normalmente.
    const ownerRes = await api(`/api/projects/${created.project.id}/flow`, {
      method: 'PUT',
      cookie: a.cookie,
      body: JSON.stringify({
        flowNodes: [{ id: 'n1', type: 'receiving', x: 0, y: 0 }],
        flowConnections: [],
      }),
    })
    expect(ownerRes.status).toBe(204)

    // O outro usuário não: 404 (não revela nem que o projeto existe).
    const intruderRes = await api(`/api/projects/${created.project.id}/flow`, {
      method: 'PUT',
      cookie: b.cookie,
      body: JSON.stringify({
        flowNodes: [{ id: 'invasor', type: 'shipping', x: 99, y: 99 }],
        flowConnections: [],
      }),
    })
    expect(intruderRes.status).toBe(404)

    // E o fluxo do dono permanece intacto.
    const getRes = await api(`/api/projects/${created.project.id}`, { cookie: a.cookie })
    const got = await getRes.json<{ project: { flowNodes: { id: string }[] } }>()
    expect(got.project.flowNodes).toHaveLength(1)
    expect(got.project.flowNodes[0]?.id).toBe('n1')
  })
})

describe('endurecimento: entradas inválidas e sessões', () => {
  it('id inexistente responde 404, não 500', async () => {
    const { cookie } = await signupAndLogin('robusto-a@example.com')
    const res = await api('/api/projects/nao-existe', { cookie })
    expect(res.status).toBe(404)
  })

  it('id malformado também responde 404 e nunca vaza detalhe interno', async () => {
    const { cookie } = await signupAndLogin('robusto-b@example.com')
    for (const id of ["'; DROP TABLE projects;--", '../../etc/passwd', '%00', 'a'.repeat(500)]) {
      const res = await api(`/api/projects/${encodeURIComponent(id)}`, { cookie })
      expect(res.status).toBe(404)
      const body = await res.text()
      expect(body).not.toMatch(/SQLITE|D1_|stack|at Object/i)
    }
    // A tabela continua de pé depois da tentativa de injeção.
    const list = await api('/api/projects', { cookie })
    expect(list.status).toBe(200)
  })

  it('campo de tipo errado nunca vira erro de servidor', async () => {
    const { cookie } = await signupAndLogin('robusto-c@example.com')
    // Nome ausente ou vazio cai no padrão de propósito; tipo errado é ignorado com segurança.
    // O que não pode acontecer, em nenhum caso, é 500 — entrada do cliente não é falha do servidor.
    for (const body of ['{"name":""}', '{"name":123}', '{"name":{"a":1}}', '{"widthM":"muito"}', '{}', 'não é json']) {
      const res = await api('/api/projects', { method: 'POST', cookie, body })
      expect(res.status).toBeLessThan(500)
    }

    const list = await (await api('/api/projects', { cookie })).json<{ projects: { name: string }[] }>()
    expect(list.projects.every((p) => typeof p.name === 'string' && p.name.length > 0)).toBe(true)
  })

  it('renomear com tipo errado é 400, não 500', async () => {
    const { cookie } = await signupAndLogin('robusto-e@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie, body: JSON.stringify({ name: 'P' }) })
    ).json<{ project: { id: string } }>()

    const res = await api(`/api/projects/${created.project.id}`, {
      method: 'PATCH',
      cookie,
      body: JSON.stringify({ name: 42 }),
    })
    expect(res.status).toBe(400)
  })

  it('payload inválido ao salvar layout é rejeitado', async () => {
    const { cookie } = await signupAndLogin('robusto-d@example.com')
    const created = await (
      await api('/api/projects', { method: 'POST', cookie, body: JSON.stringify({ name: 'P' }) })
    ).json<{ project: { id: string } }>()

    const res = await api(`/api/projects/${created.project.id}/layout`, {
      method: 'PUT',
      cookie,
      body: JSON.stringify({ objects: 'não é uma lista' }),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('sessão expirada é recusada e removida', async () => {
    const { cookie } = await signupAndLogin('expirada@example.com')
    // A sessão vale enquanto não expira…
    expect((await api('/api/projects', { cookie })).status).toBe(200)

    // …e para de valer no instante em que expira (o registro é envelhecido direto no D1).
    const db = (env as unknown as { DB: D1Database }).DB
    await db.exec("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'")

    const res = await api('/api/projects', { cookie })
    expect(res.status).toBe(401)

    const remaining = await db.prepare('SELECT COUNT(*) AS total FROM sessions').first<{ total: number }>()
    expect(remaining?.total).toBe(0)
  })

  it('cookie de sessão forjado não autentica', async () => {
    const res = await api('/api/projects', { cookie: 'argus_session=token-inventado' })
    expect(res.status).toBe(401)
  })

  it('usuário removido não continua autenticado com a sessão antiga', async () => {
    const { cookie } = await signupAndLogin('removido@example.com')
    const db = (env as unknown as { DB: D1Database }).DB
    await db.exec("DELETE FROM users WHERE email = 'removido@example.com'")

    const res = await api('/api/projects', { cookie })
    expect(res.status).toBe(401)
  })
})
