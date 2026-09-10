# ARGUS.LLP — Modelo de Dados

> Esquema real do **Cloudflare D1** (SQLite), definido em
> `worker/migrations/0001_init.sql` e usado pelo Worker (`worker/src/db.ts`).
> Ver `TECH_STACK.md` § Backend e `ARCHITECTURE.md` § 3 para o porquê da
> escolha de Cloudflare D1 em vez da proposta original (Supabase/Postgres,
> nunca implementada).
>
> Enquanto não há sessão autenticada, o app roda inteiramente no
> navegador contra um repositório local (IndexedDB/localStorage, ver
> `ARCHITECTURE.md` § 2.3) que não replica este esquema — guarda apenas
> os campos de `Layout`/`LayoutObject`/board de Fluxo usados pelo editor.
> A migração local→D1 (§ 2.4 de `ARCHITECTURE.md`) só cria projetos
> novos no D1; nunca lê/escreve as tabelas abaixo a partir do navegador.

## 1. Diagrama lógico

```
users 1───* sessions
users 1───* password_reset_tokens
users 1───* projects
```

Não há tabela de organizações/memberships: cada usuário só vê e edita
seus próprios projetos (isolamento por `user_id`, ver
`ARCHITECTURE.md` § 3) — o produto não modela times/workspaces
compartilhados nesta fase.

## 2. Tabelas

### 2.1 `users`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT, PK | UUID gerado pelo Worker. |
| email | TEXT, UNIQUE, NOCASE | Login único, case-insensitive. |
| password_hash | TEXT | PBKDF2-HMAC-SHA256 (100k iterações) + salt, nunca texto puro (ver `TECH_STACK.md`). |
| must_change_password | INTEGER (0/1) | Ligado no cadastro (senha temporária) e após um pedido de recuperação de senha; força a troca antes de liberar qualquer outra rota. |
| created_at / updated_at | TEXT (ISO 8601) | |

### 2.2 `sessions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT, PK | **Hash SHA-256** do token de sessão — o token bruto nunca é persistido, só existe no cookie `HttpOnly` do navegador. |
| user_id | TEXT, FK → users.id, ON DELETE CASCADE | |
| created_at / expires_at | TEXT (ISO 8601) | Sessão expira por tempo; login/troca de senha emite uma nova. |

Índice: `idx_sessions_user_id` em `(user_id)`.

### 2.3 `password_reset_tokens`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT, PK | Token de uso único (entregue por e-mail, nunca exibido na UI). |
| user_id | TEXT, FK → users.id, ON DELETE CASCADE | |
| created_at / expires_at | TEXT (ISO 8601) | Janela de validade do pedido de recuperação. |
| used_at | TEXT, nullable | Marcado no uso — um token usado não pode ser reaproveitado. |

Índice: `idx_reset_tokens_user_id` em `(user_id)`.

### 2.4 `projects`

Um "projeto" carrega **Layout + Fluxo juntos** no mesmo registro — o
mesmo modelo lógico usado desde a Fase 8, em que `Layout.objects` e
`Layout.flowNodes`/`flowConnections` pertencem à mesma entidade.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | TEXT, PK | |
| user_id | TEXT, FK → users.id, ON DELETE CASCADE | Dono exclusivo — toda query é filtrada por esta coluna. |
| name | TEXT | |
| description | TEXT, nullable | |
| status | TEXT, default `'active'` | Reservado para uso futuro (ex.: arquivamento). |
| scale_px_per_meter | REAL, default 50 | Escala de referência do canvas (BR-02). |
| grid_step_m | REAL, default 0.1 | Passo de snap à grade (BR-20). |
| width_m / height_m | REAL, nullable | Dimensões de referência do ambiente. |
| layout_objects | TEXT (JSON), default `'[]'` | Array de `LayoutObject` — lido/gravado por inteiro a cada save do board de Layout. |
| flow_nodes | TEXT (JSON), default `'[]'` | Array de nós do board de Fluxo. |
| flow_connections | TEXT (JSON), default `'[]'` | Array de conexões do board de Fluxo. |
| version | INTEGER, default 1 | Incrementado a cada save — suporte a estados discretos de autosave (Fase 9 § F9.7). |
| created_at / updated_at | TEXT (ISO 8601) | `updated_at` reflete o último autosave. |

Índice: `idx_projects_user_id` em `(user_id)`.

**Por que JSON em vez de tabelas `project_layout`/`project_flow`
separadas:** os dois boards são sempre lidos e gravados por inteiro
(nunca objeto a objeto — não há edição concorrente de um único objeto
por múltiplos clientes), então uma coluna JSON evita o custo de N
escritas a cada autosave sem perder nada em termos de modelagem —
decisão registrada em `worker/migrations/0001_init.sql`.

## 3. Isolamento de dados

Não há Row Level Security no D1 (SQLite não tem esse mecanismo) — o
isolamento é aplicado **na própria query SQL** de cada função em
`worker/src/db.ts`: toda leitura/escrita de `projects` inclui
`WHERE user_id = ?` com o ID do usuário da sessão atual (nunca um valor
vindo do cliente). Uma tentativa de acessar o projeto de outro usuário
por ID retorna 404 — validado por teste automatizado cruzando dois
usuários (`worker/test/projects.test.ts`).

## 4. Migrations

Versionadas em `worker/migrations/`, aplicadas via
`wrangler d1 migrations apply` (local ou remoto — ver `DEPLOYMENT.md`).
Os testes do Worker aplicam as mesmas migrations contra um D1 local
(Miniflare) antes de cada suíte, garantindo que o esquema testado seja
sempre o mesmo que roda em produção.
